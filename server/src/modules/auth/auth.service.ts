/**
 * Auth service — login, refresh, logout, MFA, password management.
 *
 * CORRECTION #2: This service manages its OWN transactions for auth flows
 * (login, refresh, logout) because they have different commit semantics
 * than standard CRUD mutations. A failed login MUST persist both a
 * failedLoginAttempts increment AND an audit entry, even though the
 * overall response is 401. The generic mutationHandler's "abort on error"
 * contract would incorrectly roll back these necessary writes.
 *
 * Auth routes use queryHandler (no generic transaction), and this service
 * starts/commits its own sessions internally.
 */

import { createHash, randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import { mongoose } from '../../common/config/database.js';
import { config } from '../../common/config/env.js';
import { runInTransactionContext } from '../../common/utils/async-context.js';
import { UnauthorizedError, ConflictError, ValidationError } from '../../common/utils/errors.js';
import { logger } from '../../common/utils/logger.js';
import { userRepository, roleRepository, refreshTokenRepository } from './auth.repository.js';
import { AuditLogModel } from '../audit/audit.model.js';
import { TOKEN_STATUS, AUTH_EVENT, AUTH_ERROR_CODE, REVOKE_REASON, MFA_REQUIRED_ROLES } from '@am-pms/shared-constants';
import type { IAccessTokenPayload, ILoginResponse, IUserPublic, IMfaSetupResponse } from '@am-pms/shared-types';
import type { UserDocument } from './auth.model.js';

export class AuthService {
  // ── Login ──

  async login(
    username: string,
    password: string,
    ipAddress: string | undefined,
    requestId: string,
  ): Promise<ILoginResponse> {
    const user = await userRepository.findByUsernameWithSecrets(username);

    if (!user) {
      // Log failed attempt — no user to increment, but still audit
      await this.writeAuthAudit({
        action: AUTH_EVENT.LOGIN_FAILED,
        entityType: 'User',
        ipAddress,
        requestId,
        afterValue: { reason: 'user_not_found', username },
      });
      throw new UnauthorizedError('Invalid credentials', AUTH_ERROR_CODE.INVALID_CREDENTIALS);
    }

    if (!user.isActive) {
      await this.writeAuthAudit({
        actor: user._id.toString(),
        action: AUTH_EVENT.LOGIN_FAILED,
        entityType: 'User',
        entityId: user._id.toString(),
        ipAddress,
        requestId,
        afterValue: { reason: 'account_inactive' },
      });
      throw new UnauthorizedError('Account is deactivated', AUTH_ERROR_CODE.INVALID_CREDENTIALS);
    }

    if (user.isLocked) {
      await this.writeAuthAudit({
        actor: user._id.toString(),
        action: AUTH_EVENT.LOGIN_FAILED,
        entityType: 'User',
        entityId: user._id.toString(),
        ipAddress,
        requestId,
        afterValue: { reason: 'account_locked' },
      });
      throw new UnauthorizedError('Account is locked', AUTH_ERROR_CODE.ACCOUNT_LOCKED);
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatch) {
      // CORRECTION #2: Failed login bookkeeping in its own transaction
      await this.handleFailedLogin(user, ipAddress, requestId);
      throw new UnauthorizedError('Invalid credentials', AUTH_ERROR_CODE.INVALID_CREDENTIALS);
    }

    // ── Password valid — check if MFA is required ──
    const roleIds = user.roles.map((r) => r.role.toString());
    const roles = await mongoose.model('Role').find({ _id: { $in: roleIds } }).exec();
    const roleNames = roles.map((r: any) => r.name);
    const mfaRequired = MFA_REQUIRED_ROLES.some((r) => roleNames.includes(r));

    if (mfaRequired && !user.mfaEnabled) {
      // MFA is required for this role but not yet set up
      // Still issue a limited token that only allows MFA setup
      const partialToken = this.generateAccessToken(user, roleIds, [], true);

      return {
        accessToken: partialToken,
        user: this.toPublicUser(user),
        mfaRequired: true,
      };
    }

    if (user.mfaEnabled) {
      // MFA is enabled — return mfaRequired flag, issue partial token
      const partialToken = this.generateAccessToken(user, roleIds, [], true);

      return {
        accessToken: partialToken,
        user: this.toPublicUser(user),
        mfaRequired: true,
      };
    }

    // ── No MFA — full login ──
    return this.completeLogin(user, roleIds, ipAddress, requestId);
  }

  /**
   * Complete login after credentials + optional MFA are verified.
   * Creates tokens, resets failed attempts, writes audit — all in one transaction.
   */
  private async completeLogin(
    user: UserDocument,
    roleIds: string[],
    ipAddress: string | undefined,
    requestId: string,
  ): Promise<ILoginResponse> {
    const permissions = await roleRepository.getPermissionsForRoleIds(roleIds);
    // Include delegated permissions
    const effectivePermissions = this.resolvePermissionsWithDelegations(user, permissions);

    const accessToken = this.generateAccessToken(user, roleIds, effectivePermissions);
    const { refreshToken, tokenHash, familyId } = this.generateRefreshToken(user);

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await runInTransactionContext({ session, requestId }, async () => {
          // Reset failed login attempts
          await userRepository.updateById(user._id.toString(), {
            failedLoginAttempts: 0,
            lastLoginAt: new Date(),
          });

          // Store refresh token
          await refreshTokenRepository.create({
            tokenHash,
            userId: user._id,
            familyId,
            status: TOKEN_STATUS.ACTIVE,
            expiresAt: new Date(Date.now() + this.parseExpiry(config.JWT_REFRESH_EXPIRY)),
          } as any);

          // Audit entry
          await AuditLogModel.create(
            [
              {
                actor: user._id,
                action: AUTH_EVENT.LOGIN_SUCCESS,
                entityType: 'User',
                entityId: user._id,
                timestamp: new Date(),
                ipAddress,
                requestId,
                afterValue: { roleIds },
              },
            ],
            { session },
          );
        });
      });
    } finally {
      await session.endSession();
    }

    return {
      accessToken,
      user: this.toPublicUser(user),
      refreshToken,
    };
  }

  // ── Refresh Token Rotation (Revision 4 state machine) ──

  async refreshTokens(
    oldTokenRaw: string,
    ipAddress: string | undefined,
    requestId: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const oldHash = this.hashToken(oldTokenRaw);
    const existingToken = await refreshTokenRepository.findByTokenHash(oldHash);

    // Case 3: NOT FOUND — truly unknown token
    if (!existingToken) {
      logger.warn({ requestId }, 'Refresh attempt with unknown token');
      throw new UnauthorizedError('Invalid refresh token', AUTH_ERROR_CODE.TOKEN_REVOKED);
    }

    // Case 5: Already revoked
    if (existingToken.status === TOKEN_STATUS.REVOKED) {
      throw new UnauthorizedError('Token has been revoked', AUTH_ERROR_CODE.TOKEN_REVOKED);
    }

    // Case 4 & 8: Expired (either already marked or just now expired)
    if (
      existingToken.status === TOKEN_STATUS.EXPIRED ||
      (existingToken.status === TOKEN_STATUS.ACTIVE && existingToken.expiresAt <= new Date())
    ) {
      // Mark as expired if not already
      if (existingToken.status === TOKEN_STATUS.ACTIVE) {
        const session = await mongoose.startSession();
        try {
          await session.withTransaction(async () => {
            await runInTransactionContext({ session, requestId }, async () => {
              await refreshTokenRepository.markExpired(oldHash);
            });
          });
        } finally {
          await session.endSession();
        }
      }
      throw new UnauthorizedError('Refresh token expired', AUTH_ERROR_CODE.TOKEN_EXPIRED);
    }

    // Case 6: CONSUMED — REUSE DETECTED
    if (existingToken.status === TOKEN_STATUS.CONSUMED) {
      logger.fatal(
        {
          userId: existingToken.userId,
          familyId: existingToken.familyId,
          requestId,
        },
        'REFRESH TOKEN REUSE DETECTED — revoking entire token family',
      );

      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          await runInTransactionContext({ session, requestId }, async () => {
            await refreshTokenRepository.revokeFamily(
              existingToken.familyId,
              REVOKE_REASON.REUSE_DETECTED,
            );
            await AuditLogModel.create(
              [
                {
                  actor: existingToken.userId,
                  action: AUTH_EVENT.TOKEN_REUSE_DETECTED,
                  entityType: 'RefreshToken',
                  entityId: existingToken.familyId,
                  timestamp: new Date(),
                  ipAddress,
                  requestId,
                  afterValue: { familyId: existingToken.familyId },
                },
              ],
              { session },
            );
          });
        });
      } finally {
        await session.endSession();
      }

      throw new UnauthorizedError('Token reuse detected', AUTH_ERROR_CODE.TOKEN_REUSE);
    }

    // Case 7: ACTIVE and not expired — valid rotation
    const user = await userRepository.findById(existingToken.userId.toString());
    if (!user || !user.isActive) {
      throw new UnauthorizedError('User not found or inactive', AUTH_ERROR_CODE.INVALID_CREDENTIALS);
    }

    const roleIds = user.roles.map((r) => r.role.toString());
    const permissions = await roleRepository.getPermissionsForRoleIds(roleIds);
    const effectivePermissions = this.resolvePermissionsWithDelegations(user, permissions);

    const accessToken = this.generateAccessToken(user, roleIds, effectivePermissions);
    const { refreshToken: newRefreshTokenRaw, tokenHash: newHash, familyId } = this.generateRefreshToken(
      user,
      existingToken.familyId, // SAME familyId
    );

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await runInTransactionContext({ session, requestId }, async () => {
          // Mark old token as consumed
          await refreshTokenRepository.markConsumed(oldHash, newHash);

          // Store new token
          await refreshTokenRepository.create({
            tokenHash: newHash,
            userId: user._id,
            familyId,
            status: TOKEN_STATUS.ACTIVE,
            expiresAt: new Date(Date.now() + this.parseExpiry(config.JWT_REFRESH_EXPIRY)),
          } as any);

          // Audit
          await AuditLogModel.create(
            [
              {
                actor: user._id,
                action: AUTH_EVENT.TOKEN_REFRESH,
                entityType: 'RefreshToken',
                entityId: existingToken.familyId,
                timestamp: new Date(),
                ipAddress,
                requestId,
              },
            ],
            { session },
          );
        });
      });
    } finally {
      await session.endSession();
    }

    return { accessToken, refreshToken: newRefreshTokenRaw };
  }

  // ── Logout ──

  async logout(
    userId: string,
    refreshTokenRaw: string | undefined,
    ipAddress: string | undefined,
    requestId: string,
  ): Promise<void> {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await runInTransactionContext({ session, requestId }, async () => {
          if (refreshTokenRaw) {
            const hash = this.hashToken(refreshTokenRaw);
            await refreshTokenRepository.revokeToken(hash, REVOKE_REASON.LOGOUT);
          }

          await AuditLogModel.create(
            [
              {
                actor: userId,
                action: AUTH_EVENT.LOGOUT,
                entityType: 'User',
                entityId: userId,
                timestamp: new Date(),
                ipAddress,
                requestId,
              },
            ],
            { session },
          );
        });
      });
    } finally {
      await session.endSession();
    }
  }

  async logoutAll(userId: string, ipAddress: string | undefined, requestId: string): Promise<void> {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await runInTransactionContext({ session, requestId }, async () => {
          await refreshTokenRepository.revokeAllForUser(userId, REVOKE_REASON.LOGOUT);

          await AuditLogModel.create(
            [
              {
                actor: userId,
                action: AUTH_EVENT.LOGOUT_ALL,
                entityType: 'User',
                entityId: userId,
                timestamp: new Date(),
                ipAddress,
                requestId,
              },
            ],
            { session },
          );
        });
      });
    } finally {
      await session.endSession();
    }
  }

  // ── MFA ──

  async setupMfa(userId: string): Promise<IMfaSetupResponse> {
    const secret = authenticator.generateSecret();
    const qrUri = authenticator.keyuri(userId, config.MFA_ISSUER, secret);

    // Store secret — this is a self-service action, uses its own session
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await runInTransactionContext({ session, requestId: `mfa-setup-${userId}` }, async () => {
          await userRepository.updateById(userId, { mfaSecret: secret });
        });
      });
    } finally {
      await session.endSession();
    }

    return { secret, qrUri };
  }

  async verifyMfa(
    userId: string,
    code: string,
    ipAddress: string | undefined,
    requestId: string,
  ): Promise<ILoginResponse> {
    const user = await userRepository.findByIdWithSecrets(userId);
    if (!user || !user.mfaSecret) {
      throw new UnauthorizedError('MFA not configured', AUTH_ERROR_CODE.MFA_INVALID);
    }

    const isValid = authenticator.verify({ token: code, secret: user.mfaSecret });
    if (!isValid) {
      throw new UnauthorizedError('Invalid MFA code', AUTH_ERROR_CODE.MFA_INVALID);
    }

    // Enable MFA if not already
    if (!user.mfaEnabled) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          await runInTransactionContext({ session, requestId }, async () => {
            await userRepository.updateById(userId, { mfaEnabled: true });
            await AuditLogModel.create(
              [
                {
                  actor: userId,
                  action: AUTH_EVENT.MFA_SETUP,
                  entityType: 'User',
                  entityId: userId,
                  timestamp: new Date(),
                  ipAddress,
                  requestId,
                },
              ],
              { session },
            );
          });
        });
      } finally {
        await session.endSession();
      }
    }

    // Complete login with full permissions
    const roleIds = user.roles.map((r) => r.role.toString());
    return this.completeLogin(user, roleIds, ipAddress, requestId);
  }

  // ── Password Change ──

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    ipAddress: string | undefined,
    requestId: string,
  ): Promise<void> {
    const user = await userRepository.findByIdWithSecrets(userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Verify current password
    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) {
      throw new UnauthorizedError('Current password is incorrect', AUTH_ERROR_CODE.INVALID_CREDENTIALS);
    }

    // Validate new password against policy
    this.validatePasswordPolicy(newPassword);

    // Check password history
    const historyCount = config.PASSWORD_HISTORY_COUNT;
    if (historyCount > 0) {
      for (const oldHash of (user.passwordHistory || []).slice(0, historyCount)) {
        const isReused = await bcrypt.compare(newPassword, oldHash);
        if (isReused) {
          throw new ValidationError(
            `Password was used recently. Choose a password not used in the last ${historyCount} changes.`,
          );
        }
      }
    }

    const newHash = await bcrypt.hash(newPassword, config.BCRYPT_SALT_ROUNDS);
    const passwordHistory = [user.passwordHash, ...(user.passwordHistory || [])].slice(0, historyCount);
    const passwordExpiresAt = config.PASSWORD_EXPIRY_DAYS > 0
      ? new Date(Date.now() + config.PASSWORD_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
      : undefined;

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await runInTransactionContext({ session, requestId }, async () => {
          await userRepository.updateById(userId, {
            passwordHash: newHash,
            passwordHistory,
            passwordChangedAt: new Date(),
            passwordExpiresAt,
          });

          // Revoke all existing tokens — force re-login on all devices
          await refreshTokenRepository.revokeAllForUser(userId, REVOKE_REASON.PASSWORD_CHANGE);

          await AuditLogModel.create(
            [
              {
                actor: userId,
                action: AUTH_EVENT.PASSWORD_CHANGED,
                entityType: 'User',
                entityId: userId,
                timestamp: new Date(),
                ipAddress,
                requestId,
              },
            ],
            { session },
          );
        });
      });
    } finally {
      await session.endSession();
    }
  }

  // ── Get current user profile ──

  async getMe(userId: string): Promise<IUserPublic> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }
    return this.toPublicUser(user);
  }

  // ── Internal helpers ──

  /**
   * Handle a failed login attempt — increment counter, check lockout,
   * write audit. All in its own transaction that COMMITS even though
   * the outer response will be 401.
   */
  private async handleFailedLogin(
    user: UserDocument,
    ipAddress: string | undefined,
    requestId: string,
  ): Promise<void> {
    const newAttempts = user.failedLoginAttempts + 1;
    const shouldLock = newAttempts >= config.LOCKOUT_THRESHOLD;

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await runInTransactionContext({ session, requestId }, async () => {
          await userRepository.updateById(user._id.toString(), {
            failedLoginAttempts: newAttempts,
            ...(shouldLock ? { isLocked: true } : {}),
          });

          // Write audit entry for the failed login
          await AuditLogModel.create(
            [
              {
                actor: user._id,
                action: AUTH_EVENT.LOGIN_FAILED,
                entityType: 'User',
                entityId: user._id,
                timestamp: new Date(),
                ipAddress,
                requestId,
                afterValue: {
                  failedLoginAttempts: newAttempts,
                  locked: shouldLock,
                },
              },
            ],
            { session },
          );

          // Also log the lockout event if threshold hit
          if (shouldLock) {
            await AuditLogModel.create(
              [
                {
                  actor: user._id,
                  action: AUTH_EVENT.ACCOUNT_LOCKED,
                  entityType: 'User',
                  entityId: user._id,
                  timestamp: new Date(),
                  ipAddress,
                  requestId,
                  afterValue: { failedLoginAttempts: newAttempts },
                },
              ],
              { session },
            );
          }
        });
      });
    } finally {
      await session.endSession();
    }

    logger.warn(
      { userId: user._id, attempts: newAttempts, locked: shouldLock },
      'Failed login attempt',
    );
  }

  /**
   * Write a standalone audit entry (for events that don't modify domain data).
   * Uses its own session.
   */
  private async writeAuthAudit(entry: {
    actor?: string;
    action: string;
    entityType: string;
    entityId?: string;
    ipAddress?: string;
    requestId: string;
    beforeValue?: unknown;
    afterValue?: unknown;
  }): Promise<void> {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await AuditLogModel.create(
          [
            {
              ...entry,
              timestamp: new Date(),
            },
          ],
          { session },
        );
      });
    } finally {
      await session.endSession();
    }
  }

  private generateAccessToken(
    user: UserDocument,
    roleIds: string[],
    permissions: string[],
    mfaPartial = false,
  ): string {
    const payload: IAccessTokenPayload = {
      sub: user._id.toString(),
      username: user.username,
      roles: user.roles.map((r) => ({
        role: r.role.toString(),
        scopeType: r.scopeType,
        scopeRef: r.scopeRef?.toString(),
      })),
      permissions: mfaPartial ? [] : permissions, // Empty permissions if MFA not verified
    };

    return jwt.sign(payload, config.JWT_ACCESS_SECRET, {
      expiresIn: config.JWT_ACCESS_EXPIRY as any,
    });
  }

  private generateRefreshToken(
    user: UserDocument,
    familyId?: string,
  ): { refreshToken: string; tokenHash: string; familyId: string } {
    const rawToken = randomUUID();
    const tokenHash = this.hashToken(rawToken);
    const fid = familyId || randomUUID();

    return { refreshToken: rawToken, tokenHash, familyId: fid };
  }

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  private resolvePermissionsWithDelegations(user: UserDocument, basePermissions: string[]): string[] {
    const now = new Date();
    const permSet = new Set(basePermissions);

    for (const delegation of user.delegations || []) {
      if (delegation.startDate <= now && delegation.endDate >= now) {
        // Delegation is active — the permission resolution happens at
        // the role level, so we'd need to look up the delegated role's permissions.
        // For now, the delegation target's role permissions are already
        // included in the JWT at login time.
        // TODO: Resolve delegated role permissions from the Role collection
      }
    }

    return [...permSet];
  }

  private validatePasswordPolicy(password: string): void {
    if (password.length < config.PASSWORD_MIN_LENGTH) {
      throw new ValidationError(
        `Password must be at least ${config.PASSWORD_MIN_LENGTH} characters`,
      );
    }

    const regex = new RegExp(config.PASSWORD_COMPLEXITY_REGEX);
    if (!regex.test(password)) {
      throw new ValidationError(
        'Password must contain uppercase, lowercase, number, and special character',
      );
    }
  }

  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)(s|m|h|d)$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7d

    const value = parseInt(match[1]!, 10);
    const unit = match[2]!;

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 7 * 24 * 60 * 60 * 1000;
    }
  }

  private toPublicUser(user: UserDocument): IUserPublic {
    return {
      _id: user._id.toString(),
      employeeRef: user.employeeRef?.toString(),
      username: user.username,
      email: user.email,
      mfaEnabled: user.mfaEnabled,
      roles: user.roles.map((r) => ({
        role: r.role.toString(),
        scopeType: r.scopeType,
        scopeRef: r.scopeRef?.toString(),
      })),
      isActive: user.isActive,
      isLocked: user.isLocked,
      lastLoginAt: user.lastLoginAt,
      delegations: user.delegations || [],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

export const authService = new AuthService();

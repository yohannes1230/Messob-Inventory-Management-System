/**
 * Auth domain repositories — extend BaseRepository per model.
 */

import { BaseRepository } from '../../common/data/base-repository.js';
import {
  UserModel, type UserDocument,
  RoleModel, type RoleDocument,
  EmployeeModel, type EmployeeDocument,
  RefreshTokenModel, type RefreshTokenDocument,
} from './auth.model.js';
import { TOKEN_STATUS, type RevokeReason } from '@am-pms/shared-constants';
import { getTransactionSession } from '../../common/utils/async-context.js';

// ── User Repository ──

class UserRepository extends BaseRepository<UserDocument> {
  constructor() {
    super(UserModel);
  }

  async findByUsername(username: string): Promise<UserDocument | null> {
    return this.model.findOne({ username: username.toLowerCase() }).exec();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.model.findOne({ email: email.toLowerCase() }).exec();
  }

  /** Fetch user WITH sensitive fields (passwordHash, mfaSecret, passwordHistory). */
  async findByIdWithSecrets(id: string): Promise<UserDocument | null> {
    return this.model.findById(id).select('+passwordHash +mfaSecret +passwordHistory').exec();
  }

  async findByUsernameWithSecrets(username: string): Promise<UserDocument | null> {
    return this.model
      .findOne({ username: username.toLowerCase() })
      .select('+passwordHash +mfaSecret +passwordHistory')
      .exec();
  }
}

export const userRepository = new UserRepository();

// ── Role Repository ──

class RoleRepository extends BaseRepository<RoleDocument> {
  constructor() {
    super(RoleModel);
  }

  async findByName(name: string): Promise<RoleDocument | null> {
    return this.model.findOne({ name: name.toLowerCase() }).exec();
  }

  async findSystemRoles(): Promise<RoleDocument[]> {
    return this.model.find({ isSystemRole: true }).exec();
  }

  async getPermissionsForRoleIds(roleIds: string[]): Promise<string[]> {
    const roles = await this.model.find({ _id: { $in: roleIds } }).exec();
    const permissionSet = new Set<string>();
    for (const role of roles) {
      for (const perm of role.permissions) {
        permissionSet.add(perm);
      }
    }
    return [...permissionSet];
  }
}

export const roleRepository = new RoleRepository();

// ── Employee Repository ──

class EmployeeRepository extends BaseRepository<EmployeeDocument> {
  constructor() {
    super(EmployeeModel);
  }

  async findByEmployeeCode(code: string): Promise<EmployeeDocument | null> {
    return this.model.findOne({ employeeCode: code }).exec();
  }
}

export const employeeRepository = new EmployeeRepository();

// ── RefreshToken Repository ──

class RefreshTokenRepository extends BaseRepository<RefreshTokenDocument> {
  constructor() {
    super(RefreshTokenModel);
  }

  async findByTokenHash(hash: string): Promise<RefreshTokenDocument | null> {
    return this.model.findOne({ tokenHash: hash }).exec();
  }

  /**
   * Mark a token as consumed and record its replacement.
   * Used during normal token rotation.
   */
  async markConsumed(tokenHash: string, replacedByHash: string): Promise<void> {
    const session = getTransactionSession();
    await this.model.updateOne(
      { tokenHash },
      {
        status: TOKEN_STATUS.CONSUMED,
        replacedByTokenHash: replacedByHash,
      },
      { session },
    );
  }

  /**
   * Mark a token as expired (lazy expiry during refresh attempt,
   * or batch transition by cleanup job).
   */
  async markExpired(tokenHash: string): Promise<void> {
    const session = getTransactionSession();
    await this.model.updateOne(
      { tokenHash },
      { status: TOKEN_STATUS.EXPIRED },
      { session },
    );
  }

  /**
   * Revoke ALL tokens in a family. Used for:
   *   - Reuse detection (entire family compromised)
   *   - Logout all sessions
   *   - Password change
   */
  async revokeFamily(
    familyId: string,
    reason: RevokeReason,
  ): Promise<void> {
    const session = getTransactionSession();
    await this.model.updateMany(
      {
        familyId,
        status: { $in: [TOKEN_STATUS.ACTIVE, TOKEN_STATUS.CONSUMED] },
      },
      {
        status: TOKEN_STATUS.REVOKED,
        revokedAt: new Date(),
        revokedReason: reason,
      },
      { session },
    );
  }

  /**
   * Revoke all token families for a user. Used for logout-all and password change.
   */
  async revokeAllForUser(userId: string, reason: RevokeReason): Promise<void> {
    const session = getTransactionSession();
    await this.model.updateMany(
      {
        userId,
        status: { $in: [TOKEN_STATUS.ACTIVE, TOKEN_STATUS.CONSUMED] },
      },
      {
        status: TOKEN_STATUS.REVOKED,
        revokedAt: new Date(),
        revokedReason: reason,
      },
      { session },
    );
  }

  /**
   * Revoke a single token. Used for single-session logout.
   */
  async revokeToken(tokenHash: string, reason: RevokeReason): Promise<void> {
    const session = getTransactionSession();
    await this.model.updateOne(
      { tokenHash },
      {
        status: TOKEN_STATUS.REVOKED,
        revokedAt: new Date(),
        revokedReason: reason,
      },
      { session },
    );
  }

  // ── Cleanup job queries (no session needed — runs outside request context) ──

  /**
   * Hard-delete tokens past the grace period.
   * Called by the token-cleanup job, NOT by request handlers.
   */
  async deleteExpiredBeyondGrace(graceDays: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - graceDays);

    const result = await this.model.deleteMany({
      $or: [
        { status: TOKEN_STATUS.EXPIRED, expiresAt: { $lt: cutoff } },
        { status: TOKEN_STATUS.REVOKED, revokedAt: { $lt: cutoff } },
        { status: TOKEN_STATUS.CONSUMED, createdAt: { $lt: cutoff } },
      ],
    });
    return result.deletedCount;
  }

  /**
   * Transition abandoned active tokens (expired but never refreshed) to 'expired'.
   * Fixes the blind spot: active tokens with past expiresAt that were never touched.
   * Called by the cleanup job before the deletion sweep (Correction #3).
   */
  async transitionAbandonedToExpired(): Promise<number> {
    const result = await this.model.updateMany(
      {
        status: TOKEN_STATUS.ACTIVE,
        expiresAt: { $lt: new Date() },
      },
      {
        status: TOKEN_STATUS.EXPIRED,
      },
    );
    return result.modifiedCount;
  }
}

export const refreshTokenRepository = new RefreshTokenRepository();

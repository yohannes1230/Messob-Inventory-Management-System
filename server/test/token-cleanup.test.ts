import { RefreshTokenModel } from '../src/modules/auth/auth.model.js';
import { runCleanup } from '../src/jobs/token-cleanup.job.js';
import { createTestUser } from './helpers.js';
import { TOKEN_STATUS, SYSTEM_ROLES } from '@am-pms/shared-constants';

describe('Token Cleanup Job Tests (Correction #3: Abandoned Sessions)', () => {
  it('should transition abandoned active tokens to expired, and sweep tokens beyond grace period', async () => {
    const { user } = await createTestUser(SYSTEM_ROLES.EMPLOYEE);

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    // Case 1 (Correction #3): Abandoned session — active token, expiresAt was 40 days ago, never touched again
    const abandonedToken = await RefreshTokenModel.create({
      tokenHash: 'abandoned_token_hash_1',
      userId: user._id,
      familyId: 'family_abandoned',
      status: TOKEN_STATUS.ACTIVE,
      expiresAt: new Date(now - 40 * dayMs),
      createdAt: new Date(now - 47 * dayMs),
    });

    // Case 2: Active valid session — expires in 5 days
    const validToken = await RefreshTokenModel.create({
      tokenHash: 'valid_token_hash_2',
      userId: user._id,
      familyId: 'family_valid',
      status: TOKEN_STATUS.ACTIVE,
      expiresAt: new Date(now + 5 * dayMs),
      createdAt: new Date(now - 2 * dayMs),
    });

    // Case 3: Revoked token past 30-day grace period (revoked 35 days ago)
    const oldRevokedToken = await RefreshTokenModel.create({
      tokenHash: 'old_revoked_token_hash_3',
      userId: user._id,
      familyId: 'family_revoked',
      status: TOKEN_STATUS.REVOKED,
      expiresAt: new Date(now - 30 * dayMs),
      revokedAt: new Date(now - 35 * dayMs),
      createdAt: new Date(now - 40 * dayMs),
    });

    // Case 4: Recently expired token (expired 5 days ago — still within 30-day grace period)
    const recentlyExpiredToken = await RefreshTokenModel.create({
      tokenHash: 'recent_expired_token_hash_4',
      userId: user._id,
      familyId: 'family_recent',
      status: TOKEN_STATUS.EXPIRED,
      expiresAt: new Date(now - 5 * dayMs),
      createdAt: new Date(now - 12 * dayMs),
    });

    // Run cleanup job
    const { transitioned, deleted } = await runCleanup();

    // Verify stats
    expect(transitioned).toBeGreaterThanOrEqual(1); // abandonedToken transitioned active -> expired
    expect(deleted).toBeGreaterThanOrEqual(2); // abandonedToken and oldRevokedToken deleted

    // 1. Abandoned token was transitioned and swept (it was > 30 days old)
    const checkAbandoned = await RefreshTokenModel.findById(abandonedToken._id);
    expect(checkAbandoned).toBeNull();

    // 2. Old revoked token was swept
    const checkRevoked = await RefreshTokenModel.findById(oldRevokedToken._id);
    expect(checkRevoked).toBeNull();

    // 3. Valid active token is preserved!
    const checkValid = await RefreshTokenModel.findById(validToken._id);
    expect(checkValid).not.toBeNull();
    expect(checkValid?.status).toBe(TOKEN_STATUS.ACTIVE);

    // 4. Recently expired token is preserved within grace period!
    const checkRecent = await RefreshTokenModel.findById(recentlyExpiredToken._id);
    expect(checkRecent).not.toBeNull();
    expect(checkRecent?.status).toBe(TOKEN_STATUS.EXPIRED);
  });
});

import request from 'supertest';
import { app } from '../src/app.js';
import { UserModel, RefreshTokenModel } from '../src/modules/auth/auth.model.js';
import { AuditLogModel } from '../src/modules/audit/audit.model.js';
import { createTestUser, getAuthHeader } from './helpers.js';
import { authenticator } from 'otplib';
import { AUTH_EVENT, TOKEN_STATUS, SYSTEM_ROLES, AUTH_ERROR_CODE } from '@am-pms/shared-constants';

describe('Auth Module Tests', () => {
  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with valid credentials and return tokens and user profile', async () => {
      const { user, password } = await createTestUser(SYSTEM_ROLES.EMPLOYEE, {
        username: 'validuser',
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'validuser', password });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.username).toBe('validuser');

      // Assert refresh token set in httpOnly cookie
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : cookies;
      expect(cookieStr).toContain('refreshToken=');
      expect(cookieStr).toContain('HttpOnly');

      // Assert successful audit log entry exists
      const audit = await AuditLogModel.findOne({
        action: AUTH_EVENT.LOGIN_SUCCESS,
        actor: user._id,
      });
      expect(audit).not.toBeNull();
    });

    it('should increment failedLoginAttempts AND persist audit log on invalid password attempt (Correction #2)', async () => {
      const { user } = await createTestUser(SYSTEM_ROLES.EMPLOYEE, {
        username: 'wrongpassuser',
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'wrongpassuser', password: 'WrongPassword@123' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);

      // Verify failedLoginAttempts is INCREMENTED in the database
      const updatedUser = await UserModel.findById(user._id);
      expect(updatedUser?.failedLoginAttempts).toBe(1);

      // Verify audit log entry exists for the failed login
      const audit = await AuditLogModel.findOne({
        action: AUTH_EVENT.LOGIN_FAILED,
        actor: user._id,
      });
      expect(audit).not.toBeNull();
      expect(audit?.entityType).toBe('User');
    });

    it('should lock the account when failedLoginAttempts reaches threshold', async () => {
      const { user } = await createTestUser(SYSTEM_ROLES.EMPLOYEE, {
        username: 'lockoutuser',
        failedLoginAttempts: 4, // 1 away from default threshold 5
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'lockoutuser', password: 'WrongPassword@123' });

      expect(res.status).toBe(401);

      const lockedUser = await UserModel.findById(user._id);
      expect(lockedUser?.failedLoginAttempts).toBe(5);
      expect(lockedUser?.isLocked).toBe(true);

      // Verify account locked audit exists
      const lockAudit = await AuditLogModel.findOne({
        action: AUTH_EVENT.ACCOUNT_LOCKED,
        actor: user._id,
      });
      expect(lockAudit).not.toBeNull();
    });

    it('should reject login if account is locked', async () => {
      const { user, password } = await createTestUser(SYSTEM_ROLES.EMPLOYEE, {
        username: 'already_locked_user',
        isLocked: true,
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'already_locked_user', password });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(AUTH_ERROR_CODE.ACCOUNT_LOCKED);

      // Verify audit log for failed login attempt on locked account
      const audit = await AuditLogModel.findOne({
        action: AUTH_EVENT.LOGIN_FAILED,
        actor: user._id,
        'afterValue.reason': 'account_locked',
      });
      expect(audit).not.toBeNull();
    });

    it('should enforce mandatory MFA for ict_admin/super_admin/finance, withhold access token and issue after TOTP verify', async () => {
      const secret = authenticator.generateSecret();
      const { user, password } = await createTestUser(SYSTEM_ROLES.ICT_ADMIN, {
        username: 'mfa_admin_user',
        mfaEnabled: true,
        mfaSecret: secret,
      });

      // Step 1: Initial login — credentials valid, but MFA is required
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'mfa_admin_user', password });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.success).toBe(true);
      expect(loginRes.body.data.mfaRequired).toBe(true);

      // Refresh token cookie must NOT be set during partial MFA state
      const cookies = loginRes.headers['set-cookie'];
      expect(cookies).toBeUndefined();

      // Partial token has empty permissions — cannot access protected routes
      const partialToken = loginRes.body.data.accessToken;
      expect(partialToken).toBeDefined();

      const protectedResBefore = await request(app)
        .get('/api/v1/auth/users')
        .set('Authorization', `Bearer ${partialToken}`);
      expect(protectedResBefore.status).toBe(403);
      expect(protectedResBefore.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');

      // Step 2: Verify TOTP code
      const totpCode = authenticator.generate(secret);
      const verifyRes = await request(app)
        .post('/api/v1/auth/mfa/verify')
        .set('Authorization', `Bearer ${partialToken}`)
        .send({ code: totpCode });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body.data.accessToken).toBeDefined();

      // Refresh token cookie is now set
      const verifyCookies = verifyRes.headers['set-cookie'];
      expect(verifyCookies).toBeDefined();

      // Step 3: Full access token succeeds on protected endpoint
      const fullToken = verifyRes.body.data.accessToken;
      const protectedResAfter = await request(app)
        .get('/api/v1/auth/users')
        .set('Authorization', `Bearer ${fullToken}`);
      expect(protectedResAfter.status).toBe(200);
    });
  });

  describe('POST /api/v1/auth/refresh (Rotation & Reuse Detection)', () => {
    it('should rotate refresh token and issue new active token', async () => {
      const { user, password } = await createTestUser(SYSTEM_ROLES.EMPLOYEE, {
        username: 'rotatetest',
      });

      // Login to get initial cookie
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'rotatetest', password });

      const cookie = loginRes.headers['set-cookie'];

      // Call refresh
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookie!);

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.data.accessToken).toBeDefined();

      // Check DB: old token is consumed, new active token created
      const consumedCount = await RefreshTokenModel.countDocuments({
        userId: user._id,
        status: TOKEN_STATUS.CONSUMED,
      });
      const activeCount = await RefreshTokenModel.countDocuments({
        userId: user._id,
        status: TOKEN_STATUS.ACTIVE,
      });
      expect(consumedCount).toBe(1);
      expect(activeCount).toBe(1);
    });

    it('should detect token reuse, revoke entire family, and log security audit', async () => {
      const { user, password } = await createTestUser(SYSTEM_ROLES.EMPLOYEE, {
        username: 'reusetest',
      });

      // Step 1: Login
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'reusetest', password });
      const originalCookie = loginRes.headers['set-cookie'];

      // Step 2: Legitimate client rotates token
      const rotateRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', originalCookie!);
      expect(rotateRes.status).toBe(200);

      // Step 3: Attacker replays the original, now-consumed token!
      const replayRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', originalCookie!);

      expect(replayRes.status).toBe(401);
      expect(replayRes.body.error.code).toBe('TOKEN_REUSE');

      // Assert entire family was revoked
      const remainingActiveTokens = await RefreshTokenModel.countDocuments({
        userId: user._id,
        status: TOKEN_STATUS.ACTIVE,
      });
      expect(remainingActiveTokens).toBe(0);

      // Assert security audit entry exists
      const reuseAudit = await AuditLogModel.findOne({
        action: AUTH_EVENT.TOKEN_REUSE_DETECTED,
        actor: user._id,
      });
      expect(reuseAudit).not.toBeNull();
    });
  });

  describe('POST /api/v1/auth/change-password', () => {
    it('should change password, revoke all sessions, and audit event', async () => {
      const oldPassword = 'OldPassword@123';
      const newPassword = 'NewPassword@456';
      const { user } = await createTestUser(SYSTEM_ROLES.EMPLOYEE, {
        username: 'pwdchangeuser',
        password: oldPassword,
      });

      // Login to create active token
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'pwdchangeuser', password: oldPassword });
      const accessToken = loginRes.body.data.accessToken;

      // Change password
      const changeRes = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currentPassword: oldPassword, newPassword });

      expect(changeRes.status).toBe(200);

      // All refresh tokens for user must be revoked
      const activeTokens = await RefreshTokenModel.countDocuments({
        userId: user._id,
        status: TOKEN_STATUS.ACTIVE,
      });
      expect(activeTokens).toBe(0);

      // Audit entry must exist
      const audit = await AuditLogModel.findOne({
        action: AUTH_EVENT.PASSWORD_CHANGED,
        actor: user._id,
      });
      expect(audit).not.toBeNull();
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should revoke token on logout and clear cookie', async () => {
      const { user, password } = await createTestUser(SYSTEM_ROLES.EMPLOYEE, {
        username: 'logout_user',
      });

      // Login to obtain access token and refresh token cookie
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'logout_user', password });

      const accessToken = loginRes.body.data.accessToken;
      const cookie = loginRes.headers['set-cookie'];
      expect(cookie).toBeDefined();

      // Call logout
      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', cookie!);

      expect(logoutRes.status).toBe(200);

      // Verify cookie cleared
      const setCookies = logoutRes.headers['set-cookie'];
      const setCookieStr = Array.isArray(setCookies) ? setCookies.join('; ') : String(setCookies);
      expect(setCookieStr).toMatch(/refreshToken=;/);

      // Verify refresh token marked REVOKED in DB
      const activeTokens = await RefreshTokenModel.countDocuments({
        userId: user._id,
        status: TOKEN_STATUS.ACTIVE,
      });
      expect(activeTokens).toBe(0);

      // Subsequent attempt to use the same revoked refresh token must fail
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookie!);

      expect(refreshRes.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/logout-all', () => {
    it('should revoke all user tokens on logout-all', async () => {
      const { user, password } = await createTestUser(SYSTEM_ROLES.EMPLOYEE, {
        username: 'logout_all_user',
      });

      // Session 1 login
      const login1 = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'logout_all_user', password });
      const token1 = login1.body.data.accessToken;
      const cookie1 = login1.headers['set-cookie'];

      // Session 2 login
      const login2 = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'logout_all_user', password });
      const cookie2 = login2.headers['set-cookie'];

      // Assert 2 active refresh tokens exist in DB
      const activeCountBefore = await RefreshTokenModel.countDocuments({
        userId: user._id,
        status: TOKEN_STATUS.ACTIVE,
      });
      expect(activeCountBefore).toBe(2);

      // Logout from all sessions
      const logoutAllRes = await request(app)
        .post('/api/v1/auth/logout-all')
        .set('Authorization', `Bearer ${token1}`);

      expect(logoutAllRes.status).toBe(200);

      // Assert 0 active tokens remain
      const activeCountAfter = await RefreshTokenModel.countDocuments({
        userId: user._id,
        status: TOKEN_STATUS.ACTIVE,
      });
      expect(activeCountAfter).toBe(0);

      // Both session refresh tokens must now fail
      const refresh1 = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookie1!);
      expect(refresh1.status).toBe(401);

      const refresh2 = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookie2!);
      expect(refresh2.status).toBe(401);
    });
  });
});

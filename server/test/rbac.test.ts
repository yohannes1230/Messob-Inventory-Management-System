import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../src/app.js';
import { createTestUser, getAuthHeader } from './helpers.js';
import { SYSTEM_ROLES } from '@am-pms/shared-constants';
import { RoleModel } from '../src/modules/auth/auth.model.js';

describe('RBAC Route & Permission Guard Verification (Definition of Done §13)', () => {
  // ════════════════════════════════════════════════════════════════════════
  // 1. User Management Endpoints (Dual Assertions: Authorized vs 403)
  // ════════════════════════════════════════════════════════════════════════

  describe('User Management Routes (user.view, user.create, user.update, user.deactivate, user.delegate, user.unlock)', () => {
    it('user.view — GET /api/v1/auth/users & GET /api/v1/auth/users/:id', async () => {
      const ictAuth = await getAuthHeader(SYSTEM_ROLES.ICT_ADMIN);
      const employeeAuth = await getAuthHeader(SYSTEM_ROLES.EMPLOYEE);
      const { user: targetUser } = await createTestUser(SYSTEM_ROLES.EMPLOYEE);

      // GET /users — authorized (ict_admin -> 200), unauthorized (employee -> 403)
      const listAuthRes = await request(app)
        .get('/api/v1/auth/users')
        .set('Authorization', ictAuth.Authorization);
      expect(listAuthRes.status).toBe(200);

      const listUnauthRes = await request(app)
        .get('/api/v1/auth/users')
        .set('Authorization', employeeAuth.Authorization);
      expect(listUnauthRes.status).toBe(403);
      expect(listUnauthRes.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');

      // GET /users/:id — authorized (ict_admin -> 200), unauthorized (employee -> 403)
      const getAuthRes = await request(app)
        .get(`/api/v1/auth/users/${targetUser._id}`)
        .set('Authorization', ictAuth.Authorization);
      expect(getAuthRes.status).toBe(200);

      const getUnauthRes = await request(app)
        .get(`/api/v1/auth/users/${targetUser._id}`)
        .set('Authorization', employeeAuth.Authorization);
      expect(getUnauthRes.status).toBe(403);
      expect(getUnauthRes.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('user.create — POST /api/v1/auth/users', async () => {
      const ictAuth = await getAuthHeader(SYSTEM_ROLES.ICT_ADMIN);
      const employeeAuth = await getAuthHeader(SYSTEM_ROLES.EMPLOYEE);
      const empRole = await RoleModel.findOne({ name: SYSTEM_ROLES.EMPLOYEE });

      const newUserData = {
        username: `rbac_created_${Date.now()}`,
        email: `rbac_created_${Date.now()}@example.com`,
        password: 'Password@123',
        roles: [{ role: empRole!._id.toString(), scopeType: 'global' }],
      };

      // Unauthorized (employee -> 403)
      const unauthRes = await request(app)
        .post('/api/v1/auth/users')
        .set('Authorization', employeeAuth.Authorization)
        .send(newUserData);
      expect(unauthRes.status).toBe(403);
      expect(unauthRes.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');

      // Authorized (ict_admin -> 201)
      const authRes = await request(app)
        .post('/api/v1/auth/users')
        .set('Authorization', ictAuth.Authorization)
        .send(newUserData);
      expect(authRes.status).toBe(201);
      expect(authRes.body.success).toBe(true);
    });

    it('user.update — PATCH /api/v1/auth/users/:id', async () => {
      const ictAuth = await getAuthHeader(SYSTEM_ROLES.ICT_ADMIN);
      const employeeAuth = await getAuthHeader(SYSTEM_ROLES.EMPLOYEE);
      const { user: targetUser } = await createTestUser(SYSTEM_ROLES.EMPLOYEE);

      // Unauthorized (employee -> 403)
      const unauthRes = await request(app)
        .patch(`/api/v1/auth/users/${targetUser._id}`)
        .set('Authorization', employeeAuth.Authorization)
        .send({ email: 'updated_by_emp@example.com' });
      expect(unauthRes.status).toBe(403);
      expect(unauthRes.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');

      // Authorized (ict_admin -> 200)
      const authRes = await request(app)
        .patch(`/api/v1/auth/users/${targetUser._id}`)
        .set('Authorization', ictAuth.Authorization)
        .send({ email: 'updated_by_ict@example.com' });
      expect(authRes.status).toBe(200);
      expect(authRes.body.data.email).toBe('updated_by_ict@example.com');
    });

    it('user.deactivate — POST /api/v1/auth/users/:id/deactivate', async () => {
      const ictAuth = await getAuthHeader(SYSTEM_ROLES.ICT_ADMIN);
      const employeeAuth = await getAuthHeader(SYSTEM_ROLES.EMPLOYEE);
      const { user: targetUser } = await createTestUser(SYSTEM_ROLES.EMPLOYEE);

      // Unauthorized (employee -> 403)
      const unauthRes = await request(app)
        .post(`/api/v1/auth/users/${targetUser._id}/deactivate`)
        .set('Authorization', employeeAuth.Authorization);
      expect(unauthRes.status).toBe(403);
      expect(unauthRes.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');

      // Authorized (ict_admin -> 200)
      const authRes = await request(app)
        .post(`/api/v1/auth/users/${targetUser._id}/deactivate`)
        .set('Authorization', ictAuth.Authorization);
      expect(authRes.status).toBe(200);
      expect(authRes.body.data.isActive).toBe(false);
    });

    it('user.delegate — POST /api/v1/auth/users/:id/delegate', async () => {
      const ictAuth = await getAuthHeader(SYSTEM_ROLES.ICT_ADMIN);
      const employeeAuth = await getAuthHeader(SYSTEM_ROLES.EMPLOYEE);
      const { user: fromUser } = await createTestUser(SYSTEM_ROLES.EMPLOYEE);
      const { user: toUser } = await createTestUser(SYSTEM_ROLES.EMPLOYEE);
      const empRole = await RoleModel.findOne({ name: SYSTEM_ROLES.EMPLOYEE });

      const delegatePayload = {
        toUser: toUser._id.toString(),
        role: empRole!._id.toString(),
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      // Unauthorized (employee -> 403)
      const unauthRes = await request(app)
        .post(`/api/v1/auth/users/${fromUser._id}/delegate`)
        .set('Authorization', employeeAuth.Authorization)
        .send(delegatePayload);
      expect(unauthRes.status).toBe(403);
      expect(unauthRes.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');

      // Authorized (ict_admin -> 200)
      const authRes = await request(app)
        .post(`/api/v1/auth/users/${fromUser._id}/delegate`)
        .set('Authorization', ictAuth.Authorization)
        .send(delegatePayload);
      expect(authRes.status).toBe(200);
      expect(authRes.body.success).toBe(true);
    });

    it('user.delegate time-bounded grant — active delegation succeeds within date range, denied outside it (FR-AUTH-08)', async () => {
      const ictRole = await RoleModel.findOne({ name: SYSTEM_ROLES.ICT_ADMIN });
      const { user: delegator } = await createTestUser(SYSTEM_ROLES.ICT_ADMIN);

      // User 1: Has ACTIVE delegation for ict_admin role (started 1h ago, ends in 1h)
      const activeDelegateeId = new mongoose.Types.ObjectId();
      const { password: activePass } = await createTestUser(SYSTEM_ROLES.EMPLOYEE, {
        _id: activeDelegateeId,
        username: 'active_delegated_emp',
        delegations: [
          {
            role: ictRole!._id,
            fromUser: delegator._id,
            toUser: activeDelegateeId,
            startDate: new Date(Date.now() - 3600000), // 1 hour ago
            endDate: new Date(Date.now() + 3600000),   // in 1 hour
          },
        ],
      });

      // User 2: Has EXPIRED delegation for ict_admin role (ended 1h ago)
      const expiredDelegateeId = new mongoose.Types.ObjectId();
      const { password: expiredPass } = await createTestUser(SYSTEM_ROLES.EMPLOYEE, {
        _id: expiredDelegateeId,
        username: 'expired_delegated_emp',
        delegations: [
          {
            role: ictRole!._id,
            fromUser: delegator._id,
            toUser: expiredDelegateeId,
            startDate: new Date(Date.now() - 7200000), // 2 hours ago
            endDate: new Date(Date.now() - 3600000),   // 1 hour ago
          },
        ],
      });

      // User 1 logs in WITHIN delegation window -> effective permissions INCLUDE user.view
      const activeLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'active_delegated_emp', password: activePass });
      expect(activeLogin.status).toBe(200);

      const activeToken = activeLogin.body.data.accessToken;
      const activeAccessRes = await request(app)
        .get('/api/v1/auth/users')
        .set('Authorization', `Bearer ${activeToken}`);
      expect(activeAccessRes.status).toBe(200);

      // User 2 logs in OUTSIDE delegation window -> effective permissions EXCLUDE user.view -> 403
      const expiredLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'expired_delegated_emp', password: expiredPass });
      expect(expiredLogin.status).toBe(200);

      const expiredToken = expiredLogin.body.data.accessToken;
      const expiredAccessRes = await request(app)
        .get('/api/v1/auth/users')
        .set('Authorization', `Bearer ${expiredToken}`);
      expect(expiredAccessRes.status).toBe(403);
      expect(expiredAccessRes.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('user.unlock — POST /api/v1/auth/users/:id/unlock', async () => {
      const ictAuth = await getAuthHeader(SYSTEM_ROLES.ICT_ADMIN);
      const employeeAuth = await getAuthHeader(SYSTEM_ROLES.EMPLOYEE);
      const { user: lockedUser } = await createTestUser(SYSTEM_ROLES.EMPLOYEE, {
        isLocked: true,
        failedLoginAttempts: 5,
      });

      // Unauthorized (employee -> 403)
      const unauthRes = await request(app)
        .post(`/api/v1/auth/users/${lockedUser._id}/unlock`)
        .set('Authorization', employeeAuth.Authorization);
      expect(unauthRes.status).toBe(403);
      expect(unauthRes.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');

      // Authorized (ict_admin -> 200)
      const authRes = await request(app)
        .post(`/api/v1/auth/users/${lockedUser._id}/unlock`)
        .set('Authorization', ictAuth.Authorization);
      expect(authRes.status).toBe(200);
      expect(authRes.body.data.isLocked).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // 2. Role Management Endpoints (Dual Assertions: Authorized vs 403)
  // ════════════════════════════════════════════════════════════════════════

  describe('Role Management Routes (role.view, role.create, role.update)', () => {
    it('role.view — GET /api/v1/auth/roles & GET /api/v1/auth/roles/:id', async () => {
      const ictAuth = await getAuthHeader(SYSTEM_ROLES.ICT_ADMIN);
      const employeeAuth = await getAuthHeader(SYSTEM_ROLES.EMPLOYEE);
      const empRole = await RoleModel.findOne({ name: SYSTEM_ROLES.EMPLOYEE });

      // GET /roles — authorized (ict_admin -> 200), unauthorized (employee -> 403)
      const listAuthRes = await request(app)
        .get('/api/v1/auth/roles')
        .set('Authorization', ictAuth.Authorization);
      expect(listAuthRes.status).toBe(200);

      const listUnauthRes = await request(app)
        .get('/api/v1/auth/roles')
        .set('Authorization', employeeAuth.Authorization);
      expect(listUnauthRes.status).toBe(403);
      expect(listUnauthRes.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');

      // GET /roles/:id — authorized (ict_admin -> 200), unauthorized (employee -> 403)
      const getAuthRes = await request(app)
        .get(`/api/v1/auth/roles/${empRole!._id}`)
        .set('Authorization', ictAuth.Authorization);
      expect(getAuthRes.status).toBe(200);

      const getUnauthRes = await request(app)
        .get(`/api/v1/auth/roles/${empRole!._id}`)
        .set('Authorization', employeeAuth.Authorization);
      expect(getUnauthRes.status).toBe(403);
      expect(getUnauthRes.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('role.create — POST /api/v1/auth/roles', async () => {
      const superAdminAuth = await getAuthHeader(SYSTEM_ROLES.SUPER_ADMIN);
      const ictAdminAuth = await getAuthHeader(SYSTEM_ROLES.ICT_ADMIN);

      const rolePayload = {
        name: `custom_role_${Date.now()}`,
        description: 'Custom role description',
        permissions: ['user.view'],
      };

      // Unauthorized (ict_admin has no role.create -> 403)
      const unauthRes = await request(app)
        .post('/api/v1/auth/roles')
        .set('Authorization', ictAdminAuth.Authorization)
        .send(rolePayload);
      expect(unauthRes.status).toBe(403);
      expect(unauthRes.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');

      // Authorized (super_admin has role.create -> 201)
      const authRes = await request(app)
        .post('/api/v1/auth/roles')
        .set('Authorization', superAdminAuth.Authorization)
        .send(rolePayload);
      expect(authRes.status).toBe(201);
      expect(authRes.body.data.name).toBe(rolePayload.name.toLowerCase());
    });

    it('role.update — PATCH /api/v1/auth/roles/:id', async () => {
      const superAdminAuth = await getAuthHeader(SYSTEM_ROLES.SUPER_ADMIN);
      const ictAdminAuth = await getAuthHeader(SYSTEM_ROLES.ICT_ADMIN);

      // Create a custom role to update
      const customRole = await RoleModel.create({
        name: `custom_patch_role_${Date.now()}`,
        description: 'Original description',
        permissions: ['user.view'],
        isSystemRole: false,
      });

      // Unauthorized (ict_admin has no role.update -> 403)
      const unauthRes = await request(app)
        .patch(`/api/v1/auth/roles/${customRole._id}`)
        .set('Authorization', ictAdminAuth.Authorization)
        .send({ description: 'Updated by unauthorized' });
      expect(unauthRes.status).toBe(403);
      expect(unauthRes.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');

      // Authorized (super_admin has role.update -> 200)
      const authRes = await request(app)
        .patch(`/api/v1/auth/roles/${customRole._id}`)
        .set('Authorization', superAdminAuth.Authorization)
        .send({ description: 'Updated by super_admin' });
      expect(authRes.status).toBe(200);
      expect(authRes.body.data.description).toBe('Updated by super_admin');
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // 3. Audit Log Endpoints (Dual Assertions: Authorized vs 403)
  // ════════════════════════════════════════════════════════════════════════

  describe('Audit Log Routes (auditlog.view.full)', () => {
    it('auditlog.view.full — GET /api/v1/audit-logs', async () => {
      const auditorAuth = await getAuthHeader(SYSTEM_ROLES.AUDITOR);
      const employeeAuth = await getAuthHeader(SYSTEM_ROLES.EMPLOYEE);

      // Authorized (auditor -> 200)
      const authRes = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', auditorAuth.Authorization);
      expect(authRes.status).toBe(200);

      // Unauthorized (employee -> 403)
      const unauthRes = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', employeeAuth.Authorization);
      expect(unauthRes.status).toBe(403);
      expect(unauthRes.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // 4. Authenticated Self-Service Routes (Dual Assertions: Auth vs 401)
  // ════════════════════════════════════════════════════════════════════════

  describe('Authenticated Endpoints (authGuard: Authorized Token vs 401 Missing/Invalid)', () => {
    it('GET /api/v1/auth/me — succeeds with token, 401 without', async () => {
      const employeeAuth = await getAuthHeader(SYSTEM_ROLES.EMPLOYEE);

      // Authorized (any authenticated user)
      const authRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', employeeAuth.Authorization);
      expect(authRes.status).toBe(200);
      expect(authRes.body.data.username).toBe(employeeAuth.user.username);

      // Unauthorized (missing token)
      const unauthRes = await request(app).get('/api/v1/auth/me');
      expect(unauthRes.status).toBe(401);
      expect(unauthRes.body.error.code).toBe('UNAUTHORIZED');
    });

    it('POST /api/v1/auth/mfa/setup — succeeds with token, 401 without', async () => {
      const employeeAuth = await getAuthHeader(SYSTEM_ROLES.EMPLOYEE);

      // Authorized
      const authRes = await request(app)
        .post('/api/v1/auth/mfa/setup')
        .set('Authorization', employeeAuth.Authorization);
      expect(authRes.status).toBe(200);
      expect(authRes.body.data.secret).toBeDefined();

      // Unauthorized
      const unauthRes = await request(app).post('/api/v1/auth/mfa/setup');
      expect(unauthRes.status).toBe(401);
      expect(unauthRes.body.error.code).toBe('UNAUTHORIZED');
    });

    it('POST /api/v1/auth/logout — succeeds with token, 401 without', async () => {
      const employeeAuth = await getAuthHeader(SYSTEM_ROLES.EMPLOYEE);

      // Authorized
      const authRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', employeeAuth.Authorization);
      expect(authRes.status).toBe(200);

      // Unauthorized
      const unauthRes = await request(app).post('/api/v1/auth/logout');
      expect(unauthRes.status).toBe(401);
      expect(unauthRes.body.error.code).toBe('UNAUTHORIZED');
    });

    it('POST /api/v1/auth/logout-all — succeeds with token, 401 without', async () => {
      const employeeAuth = await getAuthHeader(SYSTEM_ROLES.EMPLOYEE);

      // Authorized
      const authRes = await request(app)
        .post('/api/v1/auth/logout-all')
        .set('Authorization', employeeAuth.Authorization);
      expect(authRes.status).toBe(200);

      // Unauthorized
      const unauthRes = await request(app).post('/api/v1/auth/logout-all');
      expect(unauthRes.status).toBe(401);
      expect(unauthRes.body.error.code).toBe('UNAUTHORIZED');
    });

    it('POST /api/v1/auth/change-password — succeeds with valid token & input, 401 without', async () => {
      const { Authorization, password } = await getAuthHeader(SYSTEM_ROLES.EMPLOYEE);

      // Authorized
      const authRes = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', Authorization)
        .send({
          currentPassword: password,
          newPassword: 'NewPassword@654321',
        });
      expect(authRes.status).toBe(200);

      // Unauthorized
      const unauthRes = await request(app)
        .post('/api/v1/auth/change-password')
        .send({
          currentPassword: password,
          newPassword: 'NewPassword@654321',
        });
      expect(unauthRes.status).toBe(401);
      expect(unauthRes.body.error.code).toBe('UNAUTHORIZED');
    });
  });
});

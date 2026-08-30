import { jest } from '@jest/globals';
import request from 'supertest';
import { app } from '../src/app.js';
import { UserModel, RoleModel } from '../src/modules/auth/auth.model.js';
import { AuditLogModel } from '../src/modules/audit/audit.model.js';
import { getAuthHeader } from './helpers.js';
import { SYSTEM_ROLES, AUTH_EVENT } from '@am-pms/shared-constants';
import * as userServiceModule from '../src/modules/auth/user.service.js';

describe('Audit Interceptor & Transaction Atomicity Tests', () => {
  it('should atomically persist both the entity change and the audit log entry', async () => {
    const { Authorization, user: adminUser } = await getAuthHeader(SYSTEM_ROLES.SUPER_ADMIN);
    const empRole = await RoleModel.findOne({ name: SYSTEM_ROLES.EMPLOYEE });

    const username = 'atomic_test_user';
    const res = await request(app)
      .post('/api/v1/auth/users')
      .set('Authorization', Authorization)
      .send({
        username,
        email: `${username}@example.com`,
        password: 'Password@123',
        roles: [
          {
            role: empRole!._id.toString(),
            scopeType: 'global',
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const createdUserId = res.body.data._id;

    // Both User and AuditLog must exist in DB
    const userDoc = await UserModel.findById(createdUserId);
    expect(userDoc).not.toBeNull();

    const auditDoc = await AuditLogModel.findOne({
      entityType: 'User',
      entityId: createdUserId,
      action: AUTH_EVENT.USER_CREATED,
    });
    expect(auditDoc).not.toBeNull();
    expect(auditDoc?.actor?.toString()).toBe(adminUser._id.toString());
  });

  it('should roll back both the entity write and audit log if an error occurs during transaction', async () => {
    const { Authorization } = await getAuthHeader(SYSTEM_ROLES.SUPER_ADMIN);
    const empRole = await RoleModel.findOne({ name: SYSTEM_ROLES.EMPLOYEE });

    const username = 'rollback_test_user';

    // Spy on AuditLogModel.create and force it to fail inside the transaction
    const originalCreate = AuditLogModel.create;
    jest.spyOn(AuditLogModel, 'create').mockImplementationOnce((...args: any[]) => {
      throw new Error('SIMULATED_AUDIT_WRITE_FAILURE');
    });

    const res = await request(app)
      .post('/api/v1/auth/users')
      .set('Authorization', Authorization)
      .send({
        username,
        email: `${username}@example.com`,
        password: 'Password@123',
        roles: [
          {
            role: empRole!._id.toString(),
            scopeType: 'global',
          },
        ],
      });

    // Request must fail
    expect(res.status).toBe(500);

    // ATOMICITY PROOF: User document MUST NOT exist in database because transaction aborted
    const userDoc = await UserModel.findOne({ username });
    expect(userDoc).toBeNull();

    // Audit document must not exist either
    const auditDoc = await AuditLogModel.findOne({ 'afterValue.username': username });
    expect(auditDoc).toBeNull();

    // Restore
    jest.restoreAllMocks();
  });

  it('should query audit logs with pagination and filters for auditor', async () => {
    const { Authorization } = await getAuthHeader(SYSTEM_ROLES.AUDITOR);

    const res = await request(app)
      .get('/api/v1/audit-logs?page=1&limit=10')
      .set('Authorization', Authorization);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.data)).toBe(true);
    expect(res.body.data.pagination).toBeDefined();
    expect(res.body.data.pagination.page).toBe(1);
    expect(res.body.data.pagination.limit).toBe(10);
  });
});

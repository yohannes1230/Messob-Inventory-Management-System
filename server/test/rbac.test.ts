import request from 'supertest';
import { app } from '../src/app.js';
import { getAuthHeader } from './helpers.js';
import { SYSTEM_ROLES } from '@am-pms/shared-constants';

describe('RBAC Permission Guard Tests', () => {
  it('should deny employee access to user management endpoints (403 Forbidden)', async () => {
    const { Authorization } = await getAuthHeader(SYSTEM_ROLES.EMPLOYEE);

    const res = await request(app)
      .get('/api/v1/auth/users')
      .set('Authorization', Authorization);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
  });

  it('should allow ict_admin to view and create users', async () => {
    const { Authorization } = await getAuthHeader(SYSTEM_ROLES.ICT_ADMIN);

    // List users
    const listRes = await request(app)
      .get('/api/v1/auth/users')
      .set('Authorization', Authorization);
    expect(listRes.status).toBe(200);

    const { RoleModel } = await import('../src/modules/auth/auth.model.js');
    const empRole = await RoleModel.findOne({ name: SYSTEM_ROLES.EMPLOYEE });

    // Create user
    const createRes = await request(app)
      .post('/api/v1/auth/users')
      .set('Authorization', Authorization)
      .send({
        username: 'new_sub_user',
        email: 'new_sub_user@example.com',
        password: 'Password@123',
        roles: [
          {
            role: empRole!._id.toString(),
            scopeType: 'global',
          },
        ],
      });

    expect(createRes.status).toBe(201);
  });

  it('should allow auditor to view audit logs, but reject employee', async () => {
    const auditorAuth = await getAuthHeader(SYSTEM_ROLES.AUDITOR);
    const employeeAuth = await getAuthHeader(SYSTEM_ROLES.EMPLOYEE);

    const auditorRes = await request(app)
      .get('/api/v1/audit-logs')
      .set('Authorization', auditorAuth.Authorization);
    expect(auditorRes.status).toBe(200);

    const employeeRes = await request(app)
      .get('/api/v1/audit-logs')
      .set('Authorization', employeeAuth.Authorization);
    expect(employeeRes.status).toBe(403);
  });

  it('should allow super_admin to create roles, but reject ict_admin', async () => {
    const superAdminAuth = await getAuthHeader(SYSTEM_ROLES.SUPER_ADMIN);
    const ictAdminAuth = await getAuthHeader(SYSTEM_ROLES.ICT_ADMIN);

    // ict_admin cannot create roles
    const ictRes = await request(app)
      .post('/api/v1/auth/roles')
      .set('Authorization', ictAdminAuth.Authorization)
      .send({
        name: 'custom_clerk_role',
        description: 'Clerk role',
        permissions: ['user.view'],
      });
    expect(ictRes.status).toBe(403);

    // super_admin CAN create roles
    const superRes = await request(app)
      .post('/api/v1/auth/roles')
      .set('Authorization', superAdminAuth.Authorization)
      .send({
        name: 'custom_clerk_role',
        description: 'Clerk role',
        permissions: ['user.view'],
      });
    expect(superRes.status).toBe(201);
  });
});

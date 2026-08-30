import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { RoleModel, UserModel } from '../src/modules/auth/auth.model.js';
import { SYSTEM_ROLES, type SystemRole } from '@am-pms/shared-constants';
import { config } from '../src/common/config/env.js';

export async function createTestUser(roleName: SystemRole = SYSTEM_ROLES.SUPER_ADMIN, overrides: Record<string, any> = {}) {
  const role = await RoleModel.findOne({ name: roleName });
  if (!role) {
    throw new Error(`Role ${roleName} not found in test database`);
  }

  const username = overrides.username || `testuser_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const password = overrides.password || 'Test@123456';
  const passwordHash = await bcrypt.hash(password, config.BCRYPT_SALT_ROUNDS);

  const user = await UserModel.create({
    username,
    email: overrides.email || `${username}@example.com`,
    passwordHash,
    roles: [
      {
        role: role._id,
        scopeType: overrides.scopeType || 'global',
        scopeRef: overrides.scopeRef,
      },
    ],
    isActive: overrides.isActive !== undefined ? overrides.isActive : true,
    isLocked: overrides.isLocked !== undefined ? overrides.isLocked : false,
    failedLoginAttempts: overrides.failedLoginAttempts || 0,
    mfaEnabled: overrides.mfaEnabled || false,
    mfaSecret: overrides.mfaSecret,
    ...overrides,
  });

  return { user, password, role };
}

export async function getAuthHeader(roleName: SystemRole = SYSTEM_ROLES.SUPER_ADMIN, overrides: Record<string, any> = {}) {
  const { user, role } = await createTestUser(roleName, overrides);

  const payload = {
    sub: user._id.toString(),
    username: user.username,
    roles: [
      {
        role: role._id.toString(),
        scopeType: 'global',
      },
    ],
    permissions: role.permissions,
  };

  const token = jwt.sign(payload, config.JWT_ACCESS_SECRET, {
    expiresIn: config.JWT_ACCESS_EXPIRY as any,
  });

  return {
    Authorization: `Bearer ${token}`,
    user,
    token,
  };
}

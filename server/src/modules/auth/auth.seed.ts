/**
 * Seed script for the 8 system roles (Design Doc §3 RBAC matrix).
 *
 * Permission mapping confirmed explicitly (Revision 2 of implementation plan):
 * - ict_admin gets all 6 user.* permissions (full coverage of user.manage)
 * - super_admin gets all permissions including role.create/role.update
 * - auditor gets read-only permissions (*.view)
 * - Other roles get no user/role perms in Phase 1 (added in their phases)
 */

import bcrypt from 'bcrypt';
import { config } from '../../common/config/env.js';
import { logger } from '../../common/utils/logger.js';
import { RoleModel, UserModel } from './auth.model.js';
import { PERMISSIONS, SYSTEM_ROLES } from '@am-pms/shared-constants';

interface RoleSeed {
  name: string;
  description: string;
  permissions: string[];
  isSystemRole: boolean;
}

const ROLE_SEED: RoleSeed[] = [
  {
    name: SYSTEM_ROLES.EMPLOYEE,
    description: 'Standard employee with self-service access',
    permissions: [
      // Phase 1: no user/role management perms
      // Phase 3+: request.create.own, request.view.own, asset.view.assigned, etc.
    ],
    isSystemRole: true,
  },
  {
    name: SYSTEM_ROLES.PROPERTY_OFFICER,
    description: 'Manages assets, assignments, and transfers at branch/department scope',
    permissions: [
      // Phase 1: inherits employee perms (resolved at runtime via role assignment)
      // Phase 3+: asset.*, assignment.*, transfer.*, inventory.conduct, etc.
    ],
    isSystemRole: true,
  },
  {
    name: SYSTEM_ROLES.STORE_KEEPER,
    description: 'Receives and dispatches assets at store/branch scope',
    permissions: [
      // Phase 3+: asset.receive, asset.dispatch, inventory.assist, asset.view
    ],
    isSystemRole: true,
  },
  {
    name: SYSTEM_ROLES.MANAGER,
    description: 'Approves requests and views team/department reports',
    permissions: [
      // Phase 4+: request.approve, asset.view.team, report.view.department
    ],
    isSystemRole: true,
  },
  {
    name: SYSTEM_ROLES.FINANCE,
    description: 'Approves disposal/maintenance costs, views org-wide reports',
    permissions: [
      // Phase 5+: disposal.approve, maintenance.cost.approve, report.view.org, asset.value.edit
    ],
    isSystemRole: true,
  },
  {
    name: SYSTEM_ROLES.AUDITOR,
    description: 'Read-only org-wide access including full audit logs',
    permissions: [
      PERMISSIONS.USER_VIEW,          // §3: *.view (read-only, org-wide)
      PERMISSIONS.ROLE_VIEW,          // §3: *.view (read-only, org-wide)
      PERMISSIONS.AUDITLOG_VIEW_FULL, // §3: auditlog.view.full
      // Future phases: asset.view, request.view, etc. (all *.view perms)
    ],
    isSystemRole: true,
  },
  {
    name: SYSTEM_ROLES.ICT_ADMIN,
    description: 'Manages master data, custom fields, workflows, users, and notifications',
    permissions: [
      PERMISSIONS.USER_VIEW,
      PERMISSIONS.USER_CREATE,
      PERMISSIONS.USER_UPDATE,
      PERMISSIONS.USER_DEACTIVATE,
      PERMISSIONS.USER_DELEGATE,
      PERMISSIONS.USER_UNLOCK,
      PERMISSIONS.ROLE_VIEW,
      PERMISSIONS.AUDITLOG_VIEW_FULL,
      // Future phases: masterdata.*, customfield.*, workflow.*, notification.config
    ],
    isSystemRole: true,
  },
  {
    name: SYSTEM_ROLES.SUPER_ADMIN,
    description: 'Full system access including role management and system configuration',
    permissions: [
      PERMISSIONS.USER_VIEW,
      PERMISSIONS.USER_CREATE,
      PERMISSIONS.USER_UPDATE,
      PERMISSIONS.USER_DEACTIVATE,
      PERMISSIONS.USER_DELEGATE,
      PERMISSIONS.USER_UNLOCK,
      PERMISSIONS.ROLE_VIEW,
      PERMISSIONS.ROLE_CREATE,
      PERMISSIONS.ROLE_UPDATE,
      PERMISSIONS.AUDITLOG_VIEW_FULL,
      // Future phases: ALL permissions from every module
    ],
    isSystemRole: true,
  },
];

/**
 * Seeds system roles and creates a default super_admin user.
 * Idempotent — skips roles/users that already exist.
 */
export async function seedAuthData(): Promise<void> {
  logger.info('Seeding auth data...');

  // Seed roles
  for (const roleSeed of ROLE_SEED) {
    const existing = await RoleModel.findOne({ name: roleSeed.name });
    if (existing) {
      // Update permissions for existing system roles (allows adding
      // new phase permissions without re-creating the role)
      await RoleModel.updateOne(
        { name: roleSeed.name },
        { permissions: roleSeed.permissions },
      );
      logger.debug({ role: roleSeed.name }, 'Updated existing system role');
    } else {
      await RoleModel.create(roleSeed);
      logger.info({ role: roleSeed.name }, 'Created system role');
    }
  }

  // Create default super_admin user if none exists
  const superAdminRole = await RoleModel.findOne({ name: SYSTEM_ROLES.SUPER_ADMIN });
  if (!superAdminRole) {
    logger.error('super_admin role not found — seed data is corrupt');
    return;
  }

  const existingAdmin = await UserModel.findOne({ username: 'admin' });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('Admin@123456', config.BCRYPT_SALT_ROUNDS);

    await UserModel.create({
      username: 'admin',
      email: 'admin@am-pms.local',
      passwordHash,
      roles: [{ role: superAdminRole._id, scopeType: 'global' }],
      isActive: true,
      passwordChangedAt: new Date(),
      passwordExpiresAt: config.PASSWORD_EXPIRY_DAYS > 0
        ? new Date(Date.now() + config.PASSWORD_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
        : undefined,
    });

    logger.info('Created default super_admin user (username: admin)');
    logger.warn('DEFAULT ADMIN PASSWORD — change immediately after first login');
  } else {
    logger.debug('Default admin user already exists — skipping');
  }

  logger.info('Auth seed data complete');
}

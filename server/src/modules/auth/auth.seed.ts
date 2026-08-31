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

const ALL_MASTERDATA_PERMS = [
  PERMISSIONS.MASTERDATA_BRANCH_VIEW,
  PERMISSIONS.MASTERDATA_BRANCH_CREATE,
  PERMISSIONS.MASTERDATA_BRANCH_UPDATE,
  PERMISSIONS.MASTERDATA_BRANCH_DEACTIVATE,
  PERMISSIONS.MASTERDATA_BUILDING_VIEW,
  PERMISSIONS.MASTERDATA_BUILDING_CREATE,
  PERMISSIONS.MASTERDATA_BUILDING_UPDATE,
  PERMISSIONS.MASTERDATA_BUILDING_DEACTIVATE,
  PERMISSIONS.MASTERDATA_FLOOR_VIEW,
  PERMISSIONS.MASTERDATA_FLOOR_CREATE,
  PERMISSIONS.MASTERDATA_FLOOR_UPDATE,
  PERMISSIONS.MASTERDATA_FLOOR_DEACTIVATE,
  PERMISSIONS.MASTERDATA_ROOM_VIEW,
  PERMISSIONS.MASTERDATA_ROOM_CREATE,
  PERMISSIONS.MASTERDATA_ROOM_UPDATE,
  PERMISSIONS.MASTERDATA_ROOM_DEACTIVATE,
  PERMISSIONS.MASTERDATA_DEPARTMENT_VIEW,
  PERMISSIONS.MASTERDATA_DEPARTMENT_CREATE,
  PERMISSIONS.MASTERDATA_DEPARTMENT_UPDATE,
  PERMISSIONS.MASTERDATA_DEPARTMENT_DEACTIVATE,
  PERMISSIONS.MASTERDATA_CATEGORY_VIEW,
  PERMISSIONS.MASTERDATA_CATEGORY_CREATE,
  PERMISSIONS.MASTERDATA_CATEGORY_UPDATE,
  PERMISSIONS.MASTERDATA_CATEGORY_DEACTIVATE,
  PERMISSIONS.MASTERDATA_PROPERTY_TYPE_VIEW,
  PERMISSIONS.MASTERDATA_PROPERTY_TYPE_CREATE,
  PERMISSIONS.MASTERDATA_PROPERTY_TYPE_UPDATE,
  PERMISSIONS.MASTERDATA_PROPERTY_TYPE_DEACTIVATE,
  PERMISSIONS.MASTERDATA_STATUS_FLOW_VIEW,
  PERMISSIONS.MASTERDATA_STATUS_FLOW_CREATE,
  PERMISSIONS.MASTERDATA_STATUS_FLOW_UPDATE,
  PERMISSIONS.MASTERDATA_STATUS_FLOW_DEACTIVATE,
  PERMISSIONS.MASTERDATA_REQUEST_TYPE_VIEW,
  PERMISSIONS.MASTERDATA_REQUEST_TYPE_CREATE,
  PERMISSIONS.MASTERDATA_REQUEST_TYPE_UPDATE,
  PERMISSIONS.MASTERDATA_REQUEST_TYPE_DEACTIVATE,
  PERMISSIONS.CUSTOMFIELD_VIEW,
  PERMISSIONS.CUSTOMFIELD_CREATE,
  PERMISSIONS.CUSTOMFIELD_UPDATE,
  PERMISSIONS.CUSTOMFIELD_DEACTIVATE,
  PERMISSIONS.MASTERDATA_HISTORY_VIEW,
];

const ALL_MASTERDATA_VIEWS = [
  PERMISSIONS.MASTERDATA_BRANCH_VIEW,
  PERMISSIONS.MASTERDATA_BUILDING_VIEW,
  PERMISSIONS.MASTERDATA_FLOOR_VIEW,
  PERMISSIONS.MASTERDATA_ROOM_VIEW,
  PERMISSIONS.MASTERDATA_DEPARTMENT_VIEW,
  PERMISSIONS.MASTERDATA_CATEGORY_VIEW,
  PERMISSIONS.MASTERDATA_PROPERTY_TYPE_VIEW,
  PERMISSIONS.MASTERDATA_STATUS_FLOW_VIEW,
  PERMISSIONS.MASTERDATA_REQUEST_TYPE_VIEW,
  PERMISSIONS.CUSTOMFIELD_VIEW,
  PERMISSIONS.MASTERDATA_HISTORY_VIEW,
];

const ROLE_SEED: RoleSeed[] = [
  {
    name: SYSTEM_ROLES.EMPLOYEE,
    description: 'Standard employee with self-service access',
    permissions: [
      PERMISSIONS.MASTERDATA_BRANCH_VIEW,
      PERMISSIONS.MASTERDATA_BUILDING_VIEW,
      PERMISSIONS.MASTERDATA_FLOOR_VIEW,
      PERMISSIONS.MASTERDATA_ROOM_VIEW,
      PERMISSIONS.MASTERDATA_DEPARTMENT_VIEW,
      PERMISSIONS.MASTERDATA_CATEGORY_VIEW,
      PERMISSIONS.MASTERDATA_PROPERTY_TYPE_VIEW,
      PERMISSIONS.MASTERDATA_REQUEST_TYPE_VIEW,
    ],
    isSystemRole: true,
  },
  {
    name: SYSTEM_ROLES.PROPERTY_OFFICER,
    description: 'Manages assets, assignments, and transfers at branch/department scope',
    permissions: [
      ...ALL_MASTERDATA_VIEWS,
      // Branch-scoped mutation permissions (Building, Floor, Room, Department)
      PERMISSIONS.MASTERDATA_BUILDING_CREATE,
      PERMISSIONS.MASTERDATA_BUILDING_UPDATE,
      PERMISSIONS.MASTERDATA_BUILDING_DEACTIVATE,
      PERMISSIONS.MASTERDATA_FLOOR_CREATE,
      PERMISSIONS.MASTERDATA_FLOOR_UPDATE,
      PERMISSIONS.MASTERDATA_FLOOR_DEACTIVATE,
      PERMISSIONS.MASTERDATA_ROOM_CREATE,
      PERMISSIONS.MASTERDATA_ROOM_UPDATE,
      PERMISSIONS.MASTERDATA_ROOM_DEACTIVATE,
      PERMISSIONS.MASTERDATA_DEPARTMENT_CREATE,
      PERMISSIONS.MASTERDATA_DEPARTMENT_UPDATE,
      PERMISSIONS.MASTERDATA_DEPARTMENT_DEACTIVATE,
    ],
    isSystemRole: true,
  },
  {
    name: SYSTEM_ROLES.STORE_KEEPER,
    description: 'Receives and dispatches assets at store/branch scope',
    permissions: [
      PERMISSIONS.MASTERDATA_BRANCH_VIEW,
      PERMISSIONS.MASTERDATA_BUILDING_VIEW,
      PERMISSIONS.MASTERDATA_FLOOR_VIEW,
      PERMISSIONS.MASTERDATA_ROOM_VIEW,
      PERMISSIONS.MASTERDATA_DEPARTMENT_VIEW,
      PERMISSIONS.MASTERDATA_CATEGORY_VIEW,
      PERMISSIONS.MASTERDATA_PROPERTY_TYPE_VIEW,
      PERMISSIONS.MASTERDATA_REQUEST_TYPE_VIEW,
    ],
    isSystemRole: true,
  },
  {
    name: SYSTEM_ROLES.MANAGER,
    description: 'Approves requests and views team/department reports',
    permissions: [
      PERMISSIONS.MASTERDATA_BRANCH_VIEW,
      PERMISSIONS.MASTERDATA_BUILDING_VIEW,
      PERMISSIONS.MASTERDATA_FLOOR_VIEW,
      PERMISSIONS.MASTERDATA_ROOM_VIEW,
      PERMISSIONS.MASTERDATA_DEPARTMENT_VIEW,
      PERMISSIONS.MASTERDATA_CATEGORY_VIEW,
      PERMISSIONS.MASTERDATA_PROPERTY_TYPE_VIEW,
      PERMISSIONS.MASTERDATA_REQUEST_TYPE_VIEW,
    ],
    isSystemRole: true,
  },
  {
    name: SYSTEM_ROLES.FINANCE,
    description: 'Approves disposal/maintenance costs, views org-wide reports',
    permissions: [
      PERMISSIONS.MASTERDATA_BRANCH_VIEW,
      PERMISSIONS.MASTERDATA_DEPARTMENT_VIEW,
      PERMISSIONS.MASTERDATA_CATEGORY_VIEW,
      PERMISSIONS.MASTERDATA_PROPERTY_TYPE_VIEW,
      PERMISSIONS.MASTERDATA_REQUEST_TYPE_VIEW,
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
      ...ALL_MASTERDATA_VIEWS,        // §3: *.view across all master data & custom fields
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
      ...ALL_MASTERDATA_PERMS,
    ],
    isSystemRole: true,
  },
  {
    name: SYSTEM_ROLES.SUPER_ADMIN,
    description: 'Full system access including role management and system configuration',
    permissions: Object.values(PERMISSIONS),
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

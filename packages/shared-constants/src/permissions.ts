/**
 * Permission strings following the `module.action` convention (Design Doc §3).
 *
 * Phase 1 permissions cover auth, user management, role management, and audit.
 * Each subsequent phase adds its own module permissions to this object.
 *
 * These strings are the canonical source of truth — they appear in:
 *   1. Role seed data (auth.seed.ts)
 *   2. RBAC guard middleware (rbac-guard.ts)
 *   3. Route definitions (*.routes.ts)
 *   4. OpenAPI spec (x-required-permission)
 */
export const PERMISSIONS = {
  // ── User management (decomposed from design doc's `user.manage`) ──
  USER_VIEW: 'user.view',
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DEACTIVATE: 'user.deactivate',
  USER_DELEGATE: 'user.delegate',
  USER_UNLOCK: 'user.unlock',

  // ── Role management (from `role.manage` in §3) ──
  ROLE_VIEW: 'role.view',
  ROLE_CREATE: 'role.create',
  ROLE_UPDATE: 'role.update',

  // ── Audit ──
  AUDITLOG_VIEW_FULL: 'auditlog.view.full',

  // ── Phase 2: Master Data & Custom Fields (FR-MD-01→06, FR-CF-01→06) ──
  // Master Data - Branch
  MASTERDATA_BRANCH_VIEW: 'masterdata.branch.view',
  MASTERDATA_BRANCH_CREATE: 'masterdata.branch.create',
  MASTERDATA_BRANCH_UPDATE: 'masterdata.branch.update',
  MASTERDATA_BRANCH_DEACTIVATE: 'masterdata.branch.deactivate',

  // Master Data - Building (Branch-scoped for property_officer)
  MASTERDATA_BUILDING_VIEW: 'masterdata.building.view',
  MASTERDATA_BUILDING_CREATE: 'masterdata.building.create',
  MASTERDATA_BUILDING_UPDATE: 'masterdata.building.update',
  MASTERDATA_BUILDING_DEACTIVATE: 'masterdata.building.deactivate',

  // Master Data - Floor (Branch-scoped for property_officer)
  MASTERDATA_FLOOR_VIEW: 'masterdata.floor.view',
  MASTERDATA_FLOOR_CREATE: 'masterdata.floor.create',
  MASTERDATA_FLOOR_UPDATE: 'masterdata.floor.update',
  MASTERDATA_FLOOR_DEACTIVATE: 'masterdata.floor.deactivate',

  // Master Data - Room (Branch-scoped for property_officer)
  MASTERDATA_ROOM_VIEW: 'masterdata.room.view',
  MASTERDATA_ROOM_CREATE: 'masterdata.room.create',
  MASTERDATA_ROOM_UPDATE: 'masterdata.room.update',
  MASTERDATA_ROOM_DEACTIVATE: 'masterdata.room.deactivate',

  // Master Data - Department (Branch-scoped for property_officer)
  MASTERDATA_DEPARTMENT_VIEW: 'masterdata.department.view',
  MASTERDATA_DEPARTMENT_CREATE: 'masterdata.department.create',
  MASTERDATA_DEPARTMENT_UPDATE: 'masterdata.department.update',
  MASTERDATA_DEPARTMENT_DEACTIVATE: 'masterdata.department.deactivate',

  // Master Data - Category (Global)
  MASTERDATA_CATEGORY_VIEW: 'masterdata.category.view',
  MASTERDATA_CATEGORY_CREATE: 'masterdata.category.create',
  MASTERDATA_CATEGORY_UPDATE: 'masterdata.category.update',
  MASTERDATA_CATEGORY_DEACTIVATE: 'masterdata.category.deactivate',

  // Master Data - PropertyType (Global)
  MASTERDATA_PROPERTY_TYPE_VIEW: 'masterdata.property_type.view',
  MASTERDATA_PROPERTY_TYPE_CREATE: 'masterdata.property_type.create',
  MASTERDATA_PROPERTY_TYPE_UPDATE: 'masterdata.property_type.update',
  MASTERDATA_PROPERTY_TYPE_DEACTIVATE: 'masterdata.property_type.deactivate',

  // Master Data - StatusFlow (Global)
  MASTERDATA_STATUS_FLOW_VIEW: 'masterdata.status_flow.view',
  MASTERDATA_STATUS_FLOW_CREATE: 'masterdata.status_flow.create',
  MASTERDATA_STATUS_FLOW_UPDATE: 'masterdata.status_flow.update',
  MASTERDATA_STATUS_FLOW_DEACTIVATE: 'masterdata.status_flow.deactivate',

  // Master Data - RequestType (Global)
  MASTERDATA_REQUEST_TYPE_VIEW: 'masterdata.request_type.view',
  MASTERDATA_REQUEST_TYPE_CREATE: 'masterdata.request_type.create',
  MASTERDATA_REQUEST_TYPE_UPDATE: 'masterdata.request_type.update',
  MASTERDATA_REQUEST_TYPE_DEACTIVATE: 'masterdata.request_type.deactivate',

  // Custom Fields (Global)
  CUSTOMFIELD_VIEW: 'customfield.view',
  CUSTOMFIELD_CREATE: 'customfield.create',
  CUSTOMFIELD_UPDATE: 'customfield.update',
  CUSTOMFIELD_DEACTIVATE: 'customfield.deactivate',

  // Master Data History
  MASTERDATA_HISTORY_VIEW: 'masterdata.history.view',

  // ── Phase 3+: Assets & Assignments ──
  // ASSET_VIEW:       'asset.view',
  // ASSET_CREATE:     'asset.create',
  // ... etc.
} as const;

/** Union type of all valid permission strings. */
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

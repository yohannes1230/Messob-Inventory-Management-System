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

  // ── Phase 2+: Master Data & Custom Fields ──
  // MASTERDATA_VIEW:   'masterdata.view',
  // MASTERDATA_CREATE: 'masterdata.create',
  // MASTERDATA_EDIT:   'masterdata.edit',
  // CUSTOMFIELD_VIEW:  'customfield.view',
  // CUSTOMFIELD_CREATE:'customfield.create',
  // CUSTOMFIELD_EDIT:  'customfield.edit',

  // ── Phase 3+: Assets & Assignments ──
  // ASSET_VIEW:       'asset.view',
  // ASSET_CREATE:     'asset.create',
  // ... etc.
} as const;

/** Union type of all valid permission strings. */
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

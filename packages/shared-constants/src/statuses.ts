/**
 * Refresh-token status state machine (Revision 4 of Phase 1 plan).
 *
 * Transitions:
 *   active → consumed   (on successful rotation)
 *   active → expired    (on refresh attempt after expiresAt, or by cleanup job)
 *   active → revoked    (on logout, password change, or admin action)
 *   consumed → revoked  (on reuse detection — entire family)
 *   expired → (hard-deleted by cleanup job after grace period)
 *   revoked → (hard-deleted by cleanup job after grace period)
 */
export const TOKEN_STATUS = {
  ACTIVE: 'active',
  CONSUMED: 'consumed',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
} as const;

export type TokenStatus = (typeof TOKEN_STATUS)[keyof typeof TOKEN_STATUS];

/**
 * Reasons a refresh token was revoked.
 */
export const REVOKE_REASON = {
  REUSE_DETECTED: 'reuse_detected',
  LOGOUT: 'logout',
  PASSWORD_CHANGE: 'password_change',
  ADMIN_ACTION: 'admin_action',
} as const;

export type RevokeReason = (typeof REVOKE_REASON)[keyof typeof REVOKE_REASON];

/**
 * Auth event types logged to AuditLog.
 */
export const AUTH_EVENT = {
  LOGIN_SUCCESS: 'auth.login_success',
  LOGIN_FAILED: 'auth.login_failed',
  LOGOUT: 'auth.logout',
  LOGOUT_ALL: 'auth.logout_all',
  TOKEN_REFRESH: 'auth.token_refresh',
  TOKEN_REUSE_DETECTED: 'auth.token_reuse_detected',
  MFA_SETUP: 'auth.mfa_setup',
  MFA_VERIFIED: 'auth.mfa_verified',
  PASSWORD_CHANGED: 'auth.password_changed',
  ACCOUNT_LOCKED: 'auth.account_locked',
  ACCOUNT_UNLOCKED: 'auth.account_unlocked',
  USER_CREATED: 'auth.user_created',
  USER_UPDATED: 'auth.user_updated',
  USER_DEACTIVATED: 'auth.user_deactivated',
  USER_DELEGATED: 'auth.user_delegated',
  ROLE_CREATED: 'auth.role_created',
  ROLE_UPDATED: 'auth.role_updated',
} as const;

export type AuthEvent = (typeof AUTH_EVENT)[keyof typeof AUTH_EVENT];

/**
 * HTTP error codes returned by auth endpoints.
 * Clients use these to distinguish error types (e.g., TOKEN_EXPIRED
 * triggers redirect to login, not a security alert).
 */
export const AUTH_ERROR_CODE = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  MFA_REQUIRED: 'MFA_REQUIRED',
  MFA_INVALID: 'MFA_INVALID',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_REVOKED: 'TOKEN_REVOKED',
  TOKEN_REUSE: 'TOKEN_REUSE',
  PASSWORD_EXPIRED: 'PASSWORD_EXPIRED',
  PASSWORD_POLICY: 'PASSWORD_POLICY',
  PASSWORD_HISTORY: 'PASSWORD_HISTORY',
} as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODE)[keyof typeof AUTH_ERROR_CODE];

/**
 * Master data events logged to AuditLog.
 */
export const MASTERDATA_EVENT = {
  CREATED: 'masterdata.created',
  UPDATED: 'masterdata.updated',
  DEACTIVATED: 'masterdata.deactivated',
} as const;

export type MasterDataEvent = (typeof MASTERDATA_EVENT)[keyof typeof MASTERDATA_EVENT];

/**
 * Custom field events logged to AuditLog.
 */
export const CUSTOMFIELD_EVENT = {
  CREATED: 'customfield.created',
  UPDATED: 'customfield.updated',
  DEACTIVATED: 'customfield.deactivated',
} as const;

export type CustomFieldEvent = (typeof CUSTOMFIELD_EVENT)[keyof typeof CUSTOMFIELD_EVENT];

/**
 * Lifecycle states for Assets (Design Doc §7 and SRS §7).
 */
export const ASSET_STATUS = {
  AVAILABLE: 'available',
  PENDING_ACCEPTANCE: 'pending_acceptance',
  ASSIGNED: 'assigned',
  IN_TRANSFER: 'in_transfer',
  MAINTENANCE: 'maintenance',
  LOST: 'lost',
  DISPOSED: 'disposed',
} as const;

export type AssetStatus = (typeof ASSET_STATUS)[keyof typeof ASSET_STATUS];

/**
 * Lifecycle states for Assignments (Design Doc §6.2 and SRS 9.12).
 */
export const ASSIGNMENT_STATUS = {
  PENDING_ACCEPTANCE: 'pending_acceptance',
  ACTIVE: 'active',
  RETURNED: 'returned',
  TRANSFERRED: 'transferred',
} as const;

export type AssignmentStatus = (typeof ASSIGNMENT_STATUS)[keyof typeof ASSIGNMENT_STATUS];

/**
 * Asset event types logged to AuditLog.
 */
export const ASSET_EVENT = {
  CREATED: 'asset.created',
  UPDATED: 'asset.updated',
  DEACTIVATED: 'asset.deactivated',
  IMPORTED: 'asset.imported',
  PHOTO_ATTACHED: 'asset.photo_attached',
  BUNDLE_ATTACHED: 'asset.bundle_attached',
  BUNDLE_DETACHED: 'asset.bundle_detached',
} as const;

export type AssetEvent = (typeof ASSET_EVENT)[keyof typeof ASSET_EVENT];

/**
 * Assignment event types logged to AuditLog.
 */
export const ASSIGNMENT_EVENT = {
  CREATED: 'assignment.created',
  ACCEPTED: 'assignment.accepted',
  RETURNED: 'assignment.returned',
  TRANSFERRED: 'assignment.transferred',
} as const;

export type AssignmentEvent = (typeof ASSIGNMENT_EVENT)[keyof typeof ASSIGNMENT_EVENT];

/**
 * Supplier event types logged to AuditLog.
 */
export const SUPPLIER_EVENT = {
  CREATED: 'supplier.created',
  UPDATED: 'supplier.updated',
  DEACTIVATED: 'supplier.deactivated',
} as const;

export type SupplierEvent = (typeof SUPPLIER_EVENT)[keyof typeof SUPPLIER_EVENT];

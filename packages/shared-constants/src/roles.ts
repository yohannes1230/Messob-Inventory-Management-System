/**
 * System role names from the RBAC matrix (Design Doc §3).
 *
 * These are the default seed-data role names. Administrators can create
 * additional roles at runtime (FR-AUTH-06/07) — this is NOT a closed enum.
 * `isSystemRole: true` in the Role document protects these from deletion.
 */
export const SYSTEM_ROLES = {
  EMPLOYEE: 'employee',
  PROPERTY_OFFICER: 'property_officer',
  STORE_KEEPER: 'store_keeper',
  MANAGER: 'manager',
  FINANCE: 'finance',
  AUDITOR: 'auditor',
  ICT_ADMIN: 'ict_admin',
  SUPER_ADMIN: 'super_admin',
} as const;

export type SystemRole = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];

/**
 * Roles that require mandatory MFA (Design Doc §9, MFA row).
 * Confirmed scope: ict_admin, super_admin, finance.
 */
export const MFA_REQUIRED_ROLES: readonly SystemRole[] = [
  SYSTEM_ROLES.ICT_ADMIN,
  SYSTEM_ROLES.SUPER_ADMIN,
  SYSTEM_ROLES.FINANCE,
] as const;

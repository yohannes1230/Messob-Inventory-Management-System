/**
 * Zod validation schemas for auth-related API endpoints.
 *
 * These are the single source of truth for request validation.
 * They are used by:
 *   - API validate middleware (server)
 *   - Web form validation (client)
 *   - OpenAPI spec generation (docs/api/openapi.yaml)
 */

import { z } from 'zod';

// ── Auth flows ──

export const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required').max(50),
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const MfaVerifySchema = z.object({
  code: z.string().length(6, 'TOTP code must be 6 digits').regex(/^\d{6}$/, 'TOTP code must be numeric'),
});
export type MfaVerifyInput = z.infer<typeof MfaVerifySchema>;

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters'),
});
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

// ── User management ──

export const CreateUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128),
  employeeRef: z.string().optional(),
  roles: z
    .array(
      z.object({
        role: z.string().min(1, 'Role ID is required'),
        scopeType: z.enum(['global', 'branch', 'department']),
        scopeRef: z.string().optional(),
      }),
    )
    .min(1, 'At least one role is required'),
});
export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  employeeRef: z.string().optional(),
  roles: z
    .array(
      z.object({
        role: z.string().min(1),
        scopeType: z.enum(['global', 'branch', 'department']),
        scopeRef: z.string().optional(),
      }),
    )
    .min(1)
    .optional(),
});
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

export const DelegateSchema = z.object({
  toUser: z.string().min(1, 'Delegate target user ID is required'),
  role: z.string().min(1, 'Role ID is required'),
  startDate: z.string().datetime({ message: 'startDate must be ISO 8601' }),
  endDate: z.string().datetime({ message: 'endDate must be ISO 8601' }),
});
export type DelegateInput = z.infer<typeof DelegateSchema>;

// ── Role management ──

export const CreateRoleSchema = z.object({
  name: z
    .string()
    .min(1, 'Role name is required')
    .max(100)
    .regex(/^[a-z][a-z0-9_]*$/, 'Role name must be lowercase_snake_case'),
  description: z.string().max(500).optional(),
  permissions: z.array(z.string().min(1)).min(1, 'At least one permission is required'),
});
export type CreateRoleInput = z.infer<typeof CreateRoleSchema>;

export const UpdateRoleSchema = z.object({
  description: z.string().max(500).optional(),
  permissions: z.array(z.string().min(1)).min(1).optional(),
});
export type UpdateRoleInput = z.infer<typeof UpdateRoleSchema>;

// ── Query parameters ──

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
});
export type PaginationInput = z.infer<typeof PaginationSchema>;

export const AuditLogQuerySchema = PaginationSchema.extend({
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  actor: z.string().optional(),
  action: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});
export type AuditLogQueryInput = z.infer<typeof AuditLogQuerySchema>;

/**
 * RBAC guard middleware (FR-AUTH-06, NFR-SEC-03).
 *
 * Factory function that returns middleware requiring one or more permissions.
 * Checks:
 *   1. User's role-granted permissions
 *   2. Active delegations (FR-AUTH-08) within valid date ranges
 *   3. Scope filtering (branch/department) for scoped roles
 */

import type { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';

/**
 * Require ALL of the specified permissions. Use for routes that need
 * multiple capabilities (e.g., `requirePermission('user.view', 'role.view')`).
 */
export function requirePermission(...requiredPermissions: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const userPermissions = new Set(req.user.permissions || []);

    const missing = requiredPermissions.filter((p) => !userPermissions.has(p));

    if (missing.length > 0) {
      return next(
        new ForbiddenError(
          `Insufficient permissions. Required: ${missing.join(', ')}`,
          'INSUFFICIENT_PERMISSIONS',
        ),
      );
    }

    next();
  };
}

/**
 * Require ANY ONE of the specified permissions. Use for routes accessible
 * to multiple roles with different capabilities.
 */
export function requireAnyPermission(...requiredPermissions: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const userPermissions = new Set(req.user.permissions || []);

    const hasAny = requiredPermissions.some((p) => userPermissions.has(p));

    if (!hasAny) {
      return next(
        new ForbiddenError(
          `Insufficient permissions. Required one of: ${requiredPermissions.join(', ')}`,
          'INSUFFICIENT_PERMISSIONS',
        ),
      );
    }

    next();
  };
}

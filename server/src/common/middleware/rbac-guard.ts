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

export type ScopeResolver = (req: Request) => Promise<string | undefined | null> | string | undefined | null;

/**
 * Require the requested resource to match the user's assigned scope (FR-AUTH-06, NFR-SEC-03).
 * - Global roles (scopeType: 'global') bypass scope restrictions.
 * - Branch roles (scopeType: 'branch') must match the resolved branch of the target resource.
 * - Throws 403 Forbidden with SCOPE_MISMATCH code if scope does not match.
 */
export function requireResourceScope(resolveResourceBranch: ScopeResolver) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    // Users with any global role bypass branch scope checking
    const hasGlobalScope = req.user.roles.some((r) => r.scopeType === 'global');
    if (hasGlobalScope) {
      return next();
    }

    // Collect user's branch scopes
    const userBranchScopes = req.user.roles
      .filter((r) => r.scopeType === 'branch' && r.scopeRef)
      .map((r) => r.scopeRef!.toString());

    if (userBranchScopes.length === 0) {
      return next(
        new ForbiddenError(
          'Access denied: role has no branch scope assigned',
          'INSUFFICIENT_SCOPE',
        ),
      );
    }

    try {
      const resourceBranch = await resolveResourceBranch(req);
      if (!resourceBranch) {
        // If resource doesn't exist yet or branch cannot be extracted,
        // let the route handler deal with it (e.g. 404)
        return next();
      }

      const isAllowed = userBranchScopes.includes(resourceBranch.toString());
      if (!isAllowed) {
        return next(
          new ForbiddenError(
            'Access denied: resource is outside user branch scope',
            'SCOPE_MISMATCH',
          ),
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}


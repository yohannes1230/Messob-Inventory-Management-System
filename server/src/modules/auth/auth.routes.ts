/**
 * Auth routes — all Phase 1 auth, user management, and role management endpoints.
 *
 * Auth flows (login/refresh/logout/MFA/password) use queryHandler because
 * the auth service manages its own transactions internally (Correction #2).
 *
 * User/Role CRUD routes use mutationHandler for automatic transaction + audit.
 */

import { Router } from 'express';
import { PERMISSIONS } from '@am-pms/shared-constants';
import {
  LoginSchema,
  MfaVerifySchema,
  ChangePasswordSchema,
  CreateUserSchema,
  UpdateUserSchema,
  DelegateSchema,
  CreateRoleSchema,
  UpdateRoleSchema,
} from '@am-pms/shared-types';
import {
  authGuard,
  requirePermission,
  validate,
  queryHandler,
  mutationHandler,
  authRateLimiter,
} from '../../common/middleware/index.js';
import { authController } from './auth.controller.js';
import { userController } from './user.controller.js';
import { roleController } from './role.controller.js';

export const authRouter = Router();

// ════════════════════════════════════════════════════════════════════════
// Auth flows — queryHandler (auth service manages its own transactions)
// ════════════════════════════════════════════════════════════════════════

authRouter.post(
  '/login',
  authRateLimiter,
  validate(LoginSchema),
  queryHandler(authController.login.bind(authController)),
);

authRouter.post(
  '/refresh',
  authRateLimiter,
  queryHandler(authController.refresh.bind(authController)),
);

authRouter.post(
  '/logout',
  authGuard,
  queryHandler(authController.logout.bind(authController)),
);

authRouter.post(
  '/logout-all',
  authGuard,
  queryHandler(authController.logoutAll.bind(authController)),
);

authRouter.post(
  '/mfa/setup',
  authGuard,
  queryHandler(authController.setupMfa.bind(authController)),
);

authRouter.post(
  '/mfa/verify',
  authGuard,
  validate(MfaVerifySchema),
  queryHandler(authController.verifyMfa.bind(authController)),
);

authRouter.post(
  '/change-password',
  authGuard,
  validate(ChangePasswordSchema),
  queryHandler(authController.changePassword.bind(authController)),
);

authRouter.get(
  '/me',
  authGuard,
  queryHandler(authController.getMe.bind(authController)),
);

// ════════════════════════════════════════════════════════════════════════
// User management — mutationHandler (standard transaction + audit)
// ════════════════════════════════════════════════════════════════════════

authRouter.get(
  '/users',
  authGuard,
  requirePermission(PERMISSIONS.USER_VIEW),
  queryHandler(userController.list.bind(userController)),
);

authRouter.post(
  '/users',
  authGuard,
  requirePermission(PERMISSIONS.USER_CREATE),
  validate(CreateUserSchema),
  mutationHandler(userController.create.bind(userController)),
);

authRouter.get(
  '/users/:id',
  authGuard,
  requirePermission(PERMISSIONS.USER_VIEW),
  queryHandler(userController.getById.bind(userController)),
);

authRouter.patch(
  '/users/:id',
  authGuard,
  requirePermission(PERMISSIONS.USER_UPDATE),
  validate(UpdateUserSchema),
  mutationHandler(userController.update.bind(userController)),
);

authRouter.post(
  '/users/:id/deactivate',
  authGuard,
  requirePermission(PERMISSIONS.USER_DEACTIVATE),
  mutationHandler(userController.deactivate.bind(userController)),
);

authRouter.post(
  '/users/:id/delegate',
  authGuard,
  requirePermission(PERMISSIONS.USER_DELEGATE),
  validate(DelegateSchema),
  mutationHandler(userController.delegate.bind(userController)),
);

authRouter.post(
  '/users/:id/unlock',
  authGuard,
  requirePermission(PERMISSIONS.USER_UNLOCK),
  mutationHandler(userController.unlock.bind(userController)),
);

// ════════════════════════════════════════════════════════════════════════
// Role management — mutationHandler
// ════════════════════════════════════════════════════════════════════════

authRouter.get(
  '/roles',
  authGuard,
  requirePermission(PERMISSIONS.ROLE_VIEW),
  queryHandler(roleController.list.bind(roleController)),
);

authRouter.post(
  '/roles',
  authGuard,
  requirePermission(PERMISSIONS.ROLE_CREATE),
  validate(CreateRoleSchema),
  mutationHandler(roleController.create.bind(roleController)),
);

authRouter.get(
  '/roles/:id',
  authGuard,
  requirePermission(PERMISSIONS.ROLE_VIEW),
  queryHandler(roleController.getById.bind(roleController)),
);

authRouter.patch(
  '/roles/:id',
  authGuard,
  requirePermission(PERMISSIONS.ROLE_UPDATE),
  validate(UpdateRoleSchema),
  mutationHandler(roleController.update.bind(roleController)),
);

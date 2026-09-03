import { Router } from 'express';
import { requestController } from './request.controller.js';
import { authGuard } from '../../common/middleware/auth-guard.js';
import { requirePermission, requireAnyPermission } from '../../common/middleware/rbac-guard.js';
import { queryHandler, mutationHandler } from '../../common/middleware/transaction.middleware.js';
import { validate } from '../../common/middleware/validate.js';
import { PERMISSIONS } from '@am-pms/shared-constants';
import { CreateRequestSchema, CancelRequestSchema } from '@am-pms/shared-types';

export const requestRouter = Router();

// ── 1. Create Request (Asset Allocation) — FR-ESS-01 ──
requestRouter.post(
  '/',
  authGuard,
  requirePermission(PERMISSIONS.REQUEST_CREATE_OWN),
  validate(CreateRequestSchema),
  mutationHandler(requestController.create.bind(requestController)),
);

// ── 2. Personal Dashboard KPI Summary — FR-ESS-08 ──
requestRouter.get(
  '/dashboard',
  authGuard,
  requirePermission(PERMISSIONS.REQUEST_VIEW_OWN),
  queryHandler(requestController.getDashboard.bind(requestController)),
);

// ── 3. My Requests (Employee request tracking) ──
requestRouter.get(
  '/mine',
  authGuard,
  requirePermission(PERMISSIONS.REQUEST_VIEW_OWN),
  queryHandler(requestController.getMine.bind(requestController)),
);

// ── 4. List All Requests (Admin / Officer view) ──
requestRouter.get(
  '/',
  authGuard,
  requirePermission(PERMISSIONS.REQUEST_VIEW_ALL),
  queryHandler(requestController.list.bind(requestController)),
);

// ── 5. Get Request Detail ──
requestRouter.get(
  '/:id',
  authGuard,
  requireAnyPermission(PERMISSIONS.REQUEST_VIEW_OWN, PERMISSIONS.REQUEST_VIEW_ALL),
  queryHandler(requestController.getById.bind(requestController)),
);

// ── 6. Cancel Request (Employee cancellation lifecycle) ──
requestRouter.post(
  '/:id/cancel',
  authGuard,
  requirePermission(PERMISSIONS.REQUEST_CANCEL_OWN),
  validate(CancelRequestSchema),
  mutationHandler(requestController.cancel.bind(requestController)),
);

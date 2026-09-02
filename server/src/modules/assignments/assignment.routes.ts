import { Router } from 'express';
import { assignmentController } from './assignment.controller.js';
import { authGuard } from '../../common/middleware/auth-guard.js';
import { requirePermission, requireAnyPermission } from '../../common/middleware/rbac-guard.js';
import { queryHandler, mutationHandler } from '../../common/middleware/transaction.middleware.js';
import { validate } from '../../common/middleware/validate.js';
import { PERMISSIONS } from '@am-pms/shared-constants';
import {
  CreateAssignmentSchema,
  AcceptAssignmentSchema,
  ReturnAssignmentSchema,
  TransferAssignmentSchema,
} from '@am-pms/shared-types';

export const assignmentRouter = Router();

// ── 1. Create Assignment (Property Officer assignment or Store Keeper dispatch) ──
assignmentRouter.post(
  '/',
  authGuard,
  requireAnyPermission(PERMISSIONS.ASSIGNMENT_CREATE, PERMISSIONS.ASSET_DISPATCH),
  validate(CreateAssignmentSchema),
  mutationHandler(assignmentController.create.bind(assignmentController)),
);

// ── 2. Accept Assignment (Custodian accept) ──
assignmentRouter.post(
  '/:id/accept',
  authGuard,
  requirePermission(PERMISSIONS.ASSIGNMENT_ACCEPT),
  validate(AcceptAssignmentSchema),
  mutationHandler(assignmentController.accept.bind(assignmentController)),
);

// ── 3. Return Assignment (Return to store inventory) ──
assignmentRouter.post(
  '/:id/return',
  authGuard,
  requireAnyPermission(PERMISSIONS.ASSIGNMENT_CREATE, PERMISSIONS.ASSET_RECEIVE),
  validate(ReturnAssignmentSchema),
  mutationHandler(assignmentController.return.bind(assignmentController)),
);

// ── 4. Transfer Assignment (Transfer custodian / dispatch) ──
assignmentRouter.post(
  '/:id/transfer',
  authGuard,
  requireAnyPermission(PERMISSIONS.TRANSFER_CREATE, PERMISSIONS.ASSET_DISPATCH),
  validate(TransferAssignmentSchema),
  mutationHandler(assignmentController.transfer.bind(assignmentController)),
);

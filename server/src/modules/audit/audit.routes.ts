/**
 * Audit log routes — read-only endpoint for auditors/admins.
 */

import { Router } from 'express';
import { PERMISSIONS } from '@am-pms/shared-constants';
import { AuditLogQuerySchema } from '@am-pms/shared-types';
import { authGuard, requirePermission, validate, queryHandler } from '../../common/middleware/index.js';
import { auditController } from './audit.controller.js';

export const auditRouter = Router();

// GET /api/v1/audit-logs — paginated, filtered audit log query
auditRouter.get(
  '/',
  authGuard,
  requirePermission(PERMISSIONS.AUDITLOG_VIEW_FULL),
  validate({ query: AuditLogQuerySchema }),
  queryHandler(auditController.list.bind(auditController)),
);

import { Router } from 'express';
import { assetController } from './asset.controller.js';
import { assignmentController } from '../assignments/assignment.controller.js';
import { requestController } from '../requests/request.controller.js';
import { authGuard } from '../../common/middleware/auth-guard.js';
import { requirePermission, requireAnyPermission } from '../../common/middleware/rbac-guard.js';
import { queryHandler, mutationHandler } from '../../common/middleware/transaction.middleware.js';
import { validate } from '../../common/middleware/validate.js';
import { PERMISSIONS } from '@am-pms/shared-constants';
import {
  CreateAssetSchema,
  UpdateAssetSchema,
  BulkImportDryRunSchema,
  BulkImportCommitSchema,
  AttachPhotoSchema,
  AttachBundleSchema,
  ReportIssueSchema,
  RequestReturnSchema,
} from '@am-pms/shared-types';

export const assetRouter = Router();

// ── 1. List assets ──
assetRouter.get(
  '/',
  authGuard,
  requireAnyPermission(PERMISSIONS.ASSET_VIEW, PERMISSIONS.ASSET_VIEW_ASSIGNED),
  queryHandler(assetController.list.bind(assetController)),
);

// ── 2. Bulk import (dry run & commit) ──
assetRouter.post(
  '/bulk-import/dry-run',
  authGuard,
  requirePermission(PERMISSIONS.ASSET_IMPORT),
  validate(BulkImportDryRunSchema),
  queryHandler(assetController.dryRunImport.bind(assetController)),
);

assetRouter.post(
  '/bulk-import',
  authGuard,
  requirePermission(PERMISSIONS.ASSET_IMPORT),
  validate(BulkImportCommitSchema),
  mutationHandler(assetController.commitImport.bind(assetController)),
);

// ── 3. Asset Detail ──
assetRouter.get(
  '/:id',
  authGuard,
  requireAnyPermission(PERMISSIONS.ASSET_VIEW, PERMISSIONS.ASSET_VIEW_ASSIGNED),
  queryHandler(assetController.getById.bind(assetController)),
);

// ── 4. Create Asset (supports asset.create or asset.receive) ──
assetRouter.post(
  '/',
  authGuard,
  requireAnyPermission(PERMISSIONS.ASSET_CREATE, PERMISSIONS.ASSET_RECEIVE),
  validate(CreateAssetSchema),
  mutationHandler(assetController.create.bind(assetController)),
);

// ── 5. Update Asset ──
assetRouter.patch(
  '/:id',
  authGuard,
  requirePermission(PERMISSIONS.ASSET_UPDATE),
  validate(UpdateAssetSchema),
  mutationHandler(assetController.update.bind(assetController)),
);

// ── 6. Deactivate Asset (soft delete) ──
assetRouter.post(
  '/:id/deactivate',
  authGuard,
  requirePermission(PERMISSIONS.ASSET_DEACTIVATE),
  mutationHandler(assetController.deactivate.bind(assetController)),
);

// ── 7. Attach Photos (FR-REG-05) ──
assetRouter.post(
  '/:id/photos',
  authGuard,
  requirePermission(PERMISSIONS.ASSET_ATTACH_PHOTO),
  validate(AttachPhotoSchema),
  mutationHandler(assetController.attachPhotos.bind(assetController)),
);

// ── 8. QR Code Payload & Barcode (FR-REG-03) ──
assetRouter.get(
  '/:id/qr',
  authGuard,
  requireAnyPermission(PERMISSIONS.ASSET_GENERATE_QR, PERMISSIONS.ASSET_VIEW),
  queryHandler(assetController.getQr.bind(assetController)),
);

assetRouter.get(
  '/:id/barcode',
  authGuard,
  requireAnyPermission(PERMISSIONS.ASSET_GENERATE_QR, PERMISSIONS.ASSET_VIEW),
  queryHandler(assetController.getBarcode.bind(assetController)),
);

// ── 9. Bundle Management (FR-ASG-05) ──
assetRouter.post(
  '/:id/bundle/attach',
  authGuard,
  requirePermission(PERMISSIONS.ASSET_BUNDLE_MANAGE),
  validate(AttachBundleSchema),
  mutationHandler(assetController.attachBundleChild.bind(assetController)),
);

assetRouter.post(
  '/:id/bundle/detach',
  authGuard,
  requirePermission(PERMISSIONS.ASSET_BUNDLE_MANAGE),
  validate(AttachBundleSchema),
  mutationHandler(assetController.detachBundleChild.bind(assetController)),
);

// ── 10. Chronological Custody History (FR-ASG-06) ──
assetRouter.get(
  '/:id/history',
  authGuard,
  requireAnyPermission(PERMISSIONS.HISTORY_VIEW_FULL, PERMISSIONS.HISTORY_VIEW_OWN),
  queryHandler(assignmentController.getAssetHistory.bind(assignmentController)),
);

// ── 11. Report Damage / Loss / Malfunction (FR-ESS-05) ──
assetRouter.post(
  '/:id/report-issue',
  authGuard,
  requirePermission(PERMISSIONS.ASSET_REPORT_ISSUE),
  validate(ReportIssueSchema),
  mutationHandler(requestController.reportIssue.bind(requestController)),
);

// ── 12. Initiate Return Request (FR-ESS-04) ──
assetRouter.post(
  '/:id/request-return',
  authGuard,
  requirePermission(PERMISSIONS.ASSIGNMENT_RETURN),
  validate(RequestReturnSchema),
  mutationHandler(requestController.requestReturn.bind(requestController)),
);


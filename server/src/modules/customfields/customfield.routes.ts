import { Router } from 'express';
import { customFieldController } from './customfield.controller.js';
import { authGuard } from '../../common/middleware/auth-guard.js';
import { requirePermission } from '../../common/middleware/rbac-guard.js';
import { queryHandler, mutationHandler } from '../../common/middleware/transaction.middleware.js';
import { validate } from '../../common/middleware/validate.js';
import { PERMISSIONS } from '@am-pms/shared-constants';
import {
  CreateCustomFieldSchema,
  UpdateCustomFieldSchema,
} from '@am-pms/shared-types';

export const customFieldRouter = Router();

customFieldRouter.get(
  '/property-types/:propertyTypeId/custom-fields',
  authGuard,
  requirePermission(PERMISSIONS.CUSTOMFIELD_VIEW),
  queryHandler(customFieldController.getByPropertyType.bind(customFieldController)),
);

customFieldRouter.post(
  '/property-types/:propertyTypeId/custom-fields/validate',
  authGuard,
  requirePermission(PERMISSIONS.CUSTOMFIELD_VIEW),
  queryHandler(customFieldController.validateValues.bind(customFieldController)),
);

customFieldRouter.post(
  '/custom-fields',
  authGuard,
  requirePermission(PERMISSIONS.CUSTOMFIELD_CREATE),
  validate(CreateCustomFieldSchema),
  mutationHandler(customFieldController.create.bind(customFieldController)),
);

customFieldRouter.patch(
  '/custom-fields/:id',
  authGuard,
  requirePermission(PERMISSIONS.CUSTOMFIELD_UPDATE),
  validate(UpdateCustomFieldSchema),
  mutationHandler(customFieldController.update.bind(customFieldController)),
);

customFieldRouter.post(
  '/custom-fields/:id/deactivate',
  authGuard,
  requirePermission(PERMISSIONS.CUSTOMFIELD_DEACTIVATE),
  mutationHandler(customFieldController.deactivate.bind(customFieldController)),
);

customFieldRouter.get(
  '/custom-fields/:id/history',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_HISTORY_VIEW),
  queryHandler(customFieldController.getHistory.bind(customFieldController)),
);

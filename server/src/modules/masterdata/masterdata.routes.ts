import { Router } from 'express';
import { masterDataController } from './masterdata.controller.js';
import { authGuard } from '../../common/middleware/auth-guard.js';
import { requirePermission, requireResourceScope } from '../../common/middleware/rbac-guard.js';
import { queryHandler, mutationHandler } from '../../common/middleware/transaction.middleware.js';
import { validate } from '../../common/middleware/validate.js';
import { PERMISSIONS } from '@am-pms/shared-constants';
import {
  CreateBranchSchema,
  UpdateBranchSchema,
  CreateBuildingSchema,
  UpdateBuildingSchema,
  CreateFloorSchema,
  UpdateFloorSchema,
  CreateRoomSchema,
  UpdateRoomSchema,
  CreateDepartmentSchema,
  UpdateDepartmentSchema,
  CreateCategorySchema,
  UpdateCategorySchema,
  CreatePropertyTypeSchema,
  UpdatePropertyTypeSchema,
  CreateStatusFlowSchema,
  UpdateStatusFlowSchema,
  CreateRequestTypeSchema,
  UpdateRequestTypeSchema,
} from '@am-pms/shared-types';
import {
  BuildingModel,
  FloorModel,
  RoomModel,
  DepartmentModel,
} from './masterdata.model.js';

export const masterDataRouter = Router();

// ════════════════════════════════════════════════════════════════════════════
// 1. Branch Routes (Global)
// ════════════════════════════════════════════════════════════════════════════
const branchRouter = Router();
branchRouter.get(
  '/',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_BRANCH_VIEW),
  queryHandler(masterDataController.list('branch')),
);
branchRouter.get(
  '/:id',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_BRANCH_VIEW),
  queryHandler(masterDataController.getById('branch')),
);
branchRouter.post(
  '/',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_BRANCH_CREATE),
  validate(CreateBranchSchema),
  mutationHandler(masterDataController.create('branch')),
);
branchRouter.patch(
  '/:id',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_BRANCH_UPDATE),
  validate(UpdateBranchSchema),
  mutationHandler(masterDataController.update('branch')),
);
branchRouter.post(
  '/:id/deactivate',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_BRANCH_DEACTIVATE),
  mutationHandler(masterDataController.deactivate('branch')),
);
branchRouter.delete(
  '/:id',
  authGuard,
  queryHandler(masterDataController.hardDelete.bind(masterDataController)),
);
branchRouter.get(
  '/:id/history',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_HISTORY_VIEW),
  queryHandler(masterDataController.getHistory('branch')),
);
masterDataRouter.use('/branches', branchRouter);

// ════════════════════════════════════════════════════════════════════════════
// 2. Building Routes (Branch-Scoped for property_officer)
// ════════════════════════════════════════════════════════════════════════════
const buildingRouter = Router();
buildingRouter.get(
  '/',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_BUILDING_VIEW),
  queryHandler(masterDataController.list('building')),
);
buildingRouter.get(
  '/:id',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_BUILDING_VIEW),
  queryHandler(masterDataController.getById('building')),
);
buildingRouter.post(
  '/',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_BUILDING_CREATE),
  requireResourceScope((req) => req.body.branch),
  validate(CreateBuildingSchema),
  mutationHandler(masterDataController.create('building')),
);
buildingRouter.patch(
  '/:id',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_BUILDING_UPDATE),
  requireResourceScope(async (req) => {
    const b = await BuildingModel.findById(req.params.id);
    return b?.branch?.toString();
  }),
  validate(UpdateBuildingSchema),
  mutationHandler(masterDataController.update('building')),
);
buildingRouter.post(
  '/:id/deactivate',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_BUILDING_DEACTIVATE),
  requireResourceScope(async (req) => {
    const b = await BuildingModel.findById(req.params.id);
    return b?.branch?.toString();
  }),
  mutationHandler(masterDataController.deactivate('building')),
);
buildingRouter.delete(
  '/:id',
  authGuard,
  queryHandler(masterDataController.hardDelete.bind(masterDataController)),
);
buildingRouter.get(
  '/:id/history',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_HISTORY_VIEW),
  queryHandler(masterDataController.getHistory('building')),
);
masterDataRouter.use('/buildings', buildingRouter);

// ════════════════════════════════════════════════════════════════════════════
// 3. Floor Routes (Branch-Scoped via Building)
// ════════════════════════════════════════════════════════════════════════════
const floorRouter = Router();
floorRouter.get(
  '/',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_FLOOR_VIEW),
  queryHandler(masterDataController.list('floor')),
);
floorRouter.get(
  '/:id',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_FLOOR_VIEW),
  queryHandler(masterDataController.getById('floor')),
);
floorRouter.post(
  '/',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_FLOOR_CREATE),
  requireResourceScope(async (req) => {
    const b = await BuildingModel.findById(req.body.building);
    return b?.branch?.toString();
  }),
  validate(CreateFloorSchema),
  mutationHandler(masterDataController.create('floor')),
);
floorRouter.patch(
  '/:id',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_FLOOR_UPDATE),
  requireResourceScope(async (req) => {
    const f = await FloorModel.findById(req.params.id);
    if (!f) return undefined;
    const b = await BuildingModel.findById(f.building);
    return b?.branch?.toString();
  }),
  validate(UpdateFloorSchema),
  mutationHandler(masterDataController.update('floor')),
);
floorRouter.post(
  '/:id/deactivate',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_FLOOR_DEACTIVATE),
  requireResourceScope(async (req) => {
    const f = await FloorModel.findById(req.params.id);
    if (!f) return undefined;
    const b = await BuildingModel.findById(f.building);
    return b?.branch?.toString();
  }),
  mutationHandler(masterDataController.deactivate('floor')),
);
floorRouter.delete(
  '/:id',
  authGuard,
  queryHandler(masterDataController.hardDelete.bind(masterDataController)),
);
floorRouter.get(
  '/:id/history',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_HISTORY_VIEW),
  queryHandler(masterDataController.getHistory('floor')),
);
masterDataRouter.use('/floors', floorRouter);

// ════════════════════════════════════════════════════════════════════════════
// 4. Room Routes (Branch-Scoped via Floor -> Building -> Branch)
// ════════════════════════════════════════════════════════════════════════════
const roomRouter = Router();
roomRouter.get(
  '/',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_ROOM_VIEW),
  queryHandler(masterDataController.list('room')),
);
roomRouter.get(
  '/:id',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_ROOM_VIEW),
  queryHandler(masterDataController.getById('room')),
);
roomRouter.post(
  '/',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_ROOM_CREATE),
  requireResourceScope(async (req) => {
    if (req.body.branch) return req.body.branch;
    const f = await FloorModel.findById(req.body.floor);
    if (!f) return undefined;
    const b = await BuildingModel.findById(f.building);
    return b?.branch?.toString();
  }),
  validate(CreateRoomSchema),
  mutationHandler(masterDataController.create('room')),
);
roomRouter.patch(
  '/:id',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_ROOM_UPDATE),
  requireResourceScope(async (req) => {
    const r = await RoomModel.findById(req.params.id);
    if (!r) return undefined;
    if (r.branch) return r.branch.toString();
    const f = await FloorModel.findById(r.floor);
    if (!f) return undefined;
    const b = await BuildingModel.findById(f.building);
    return b?.branch?.toString();
  }),
  validate(UpdateRoomSchema),
  mutationHandler(masterDataController.update('room')),
);
roomRouter.post(
  '/:id/deactivate',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_ROOM_DEACTIVATE),
  requireResourceScope(async (req) => {
    const r = await RoomModel.findById(req.params.id);
    if (!r) return undefined;
    if (r.branch) return r.branch.toString();
    const f = await FloorModel.findById(r.floor);
    if (!f) return undefined;
    const b = await BuildingModel.findById(f.building);
    return b?.branch?.toString();
  }),
  mutationHandler(masterDataController.deactivate('room')),
);
roomRouter.delete(
  '/:id',
  authGuard,
  queryHandler(masterDataController.hardDelete.bind(masterDataController)),
);
roomRouter.get(
  '/:id/history',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_HISTORY_VIEW),
  queryHandler(masterDataController.getHistory('room')),
);
masterDataRouter.use('/rooms', roomRouter);

// ════════════════════════════════════════════════════════════════════════════
// 5. Department Routes (Branch-Scoped direct field)
// ════════════════════════════════════════════════════════════════════════════
const departmentRouter = Router();
departmentRouter.get(
  '/',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_DEPARTMENT_VIEW),
  queryHandler(masterDataController.list('department')),
);
departmentRouter.get(
  '/:id',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_DEPARTMENT_VIEW),
  queryHandler(masterDataController.getById('department')),
);
departmentRouter.post(
  '/',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_DEPARTMENT_CREATE),
  requireResourceScope((req) => req.body.branch),
  validate(CreateDepartmentSchema),
  mutationHandler(masterDataController.create('department')),
);
departmentRouter.patch(
  '/:id',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_DEPARTMENT_UPDATE),
  requireResourceScope(async (req) => {
    const d = await DepartmentModel.findById(req.params.id);
    return d?.branch?.toString();
  }),
  validate(UpdateDepartmentSchema),
  mutationHandler(masterDataController.update('department')),
);
departmentRouter.post(
  '/:id/deactivate',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_DEPARTMENT_DEACTIVATE),
  requireResourceScope(async (req) => {
    const d = await DepartmentModel.findById(req.params.id);
    return d?.branch?.toString();
  }),
  mutationHandler(masterDataController.deactivate('department')),
);
departmentRouter.delete(
  '/:id',
  authGuard,
  queryHandler(masterDataController.hardDelete.bind(masterDataController)),
);
departmentRouter.get(
  '/:id/history',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_HISTORY_VIEW),
  queryHandler(masterDataController.getHistory('department')),
);
masterDataRouter.use('/departments', departmentRouter);

// ════════════════════════════════════════════════════════════════════════════
// 6. Category Routes (Global)
// ════════════════════════════════════════════════════════════════════════════
const categoryRouter = Router();
categoryRouter.get(
  '/',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_CATEGORY_VIEW),
  queryHandler(masterDataController.list('category')),
);
categoryRouter.get(
  '/:id',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_CATEGORY_VIEW),
  queryHandler(masterDataController.getById('category')),
);
categoryRouter.post(
  '/',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_CATEGORY_CREATE),
  validate(CreateCategorySchema),
  mutationHandler(masterDataController.create('category')),
);
categoryRouter.patch(
  '/:id',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_CATEGORY_UPDATE),
  validate(UpdateCategorySchema),
  mutationHandler(masterDataController.update('category')),
);
categoryRouter.post(
  '/:id/deactivate',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_CATEGORY_DEACTIVATE),
  mutationHandler(masterDataController.deactivate('category')),
);
categoryRouter.delete(
  '/:id',
  authGuard,
  queryHandler(masterDataController.hardDelete.bind(masterDataController)),
);
categoryRouter.get(
  '/:id/history',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_HISTORY_VIEW),
  queryHandler(masterDataController.getHistory('category')),
);
masterDataRouter.use('/categories', categoryRouter);

// ════════════════════════════════════════════════════════════════════════════
// 7. PropertyType Routes (Global)
// ════════════════════════════════════════════════════════════════════════════
const propertyTypeRouter = Router();
propertyTypeRouter.get(
  '/',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_PROPERTY_TYPE_VIEW),
  queryHandler(masterDataController.list('property_type')),
);
propertyTypeRouter.get(
  '/:id',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_PROPERTY_TYPE_VIEW),
  queryHandler(masterDataController.getById('property_type')),
);
propertyTypeRouter.post(
  '/',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_PROPERTY_TYPE_CREATE),
  validate(CreatePropertyTypeSchema),
  mutationHandler(masterDataController.create('property_type')),
);
propertyTypeRouter.patch(
  '/:id',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_PROPERTY_TYPE_UPDATE),
  validate(UpdatePropertyTypeSchema),
  mutationHandler(masterDataController.update('property_type')),
);
propertyTypeRouter.post(
  '/:id/deactivate',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_PROPERTY_TYPE_DEACTIVATE),
  mutationHandler(masterDataController.deactivate('property_type')),
);
propertyTypeRouter.delete(
  '/:id',
  authGuard,
  queryHandler(masterDataController.hardDelete.bind(masterDataController)),
);
propertyTypeRouter.get(
  '/:id/history',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_HISTORY_VIEW),
  queryHandler(masterDataController.getHistory('property_type')),
);
masterDataRouter.use('/property-types', propertyTypeRouter);

// ════════════════════════════════════════════════════════════════════════════
// 8. StatusFlow Routes (Global)
// ════════════════════════════════════════════════════════════════════════════
const statusFlowRouter = Router();
statusFlowRouter.get(
  '/',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_STATUS_FLOW_VIEW),
  queryHandler(masterDataController.list('status_flow')),
);
statusFlowRouter.get(
  '/:id',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_STATUS_FLOW_VIEW),
  queryHandler(masterDataController.getById('status_flow')),
);
statusFlowRouter.post(
  '/',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_STATUS_FLOW_CREATE),
  validate(CreateStatusFlowSchema),
  mutationHandler(masterDataController.create('status_flow')),
);
statusFlowRouter.patch(
  '/:id',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_STATUS_FLOW_UPDATE),
  validate(UpdateStatusFlowSchema),
  mutationHandler(masterDataController.update('status_flow')),
);
statusFlowRouter.post(
  '/:id/deactivate',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_STATUS_FLOW_DEACTIVATE),
  mutationHandler(masterDataController.deactivate('status_flow')),
);
statusFlowRouter.delete(
  '/:id',
  authGuard,
  queryHandler(masterDataController.hardDelete.bind(masterDataController)),
);
statusFlowRouter.get(
  '/:id/history',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_HISTORY_VIEW),
  queryHandler(masterDataController.getHistory('status_flow')),
);
masterDataRouter.use('/status-flows', statusFlowRouter);

// ════════════════════════════════════════════════════════════════════════════
// 9. RequestType Routes (Global)
// ════════════════════════════════════════════════════════════════════════════
const requestTypeRouter = Router();
requestTypeRouter.get(
  '/',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_REQUEST_TYPE_VIEW),
  queryHandler(masterDataController.list('request_type')),
);
requestTypeRouter.get(
  '/:id',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_REQUEST_TYPE_VIEW),
  queryHandler(masterDataController.getById('request_type')),
);
requestTypeRouter.post(
  '/',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_REQUEST_TYPE_CREATE),
  validate(CreateRequestTypeSchema),
  mutationHandler(masterDataController.create('request_type')),
);
requestTypeRouter.patch(
  '/:id',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_REQUEST_TYPE_UPDATE),
  validate(UpdateRequestTypeSchema),
  mutationHandler(masterDataController.update('request_type')),
);
requestTypeRouter.post(
  '/:id/deactivate',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_REQUEST_TYPE_DEACTIVATE),
  mutationHandler(masterDataController.deactivate('request_type')),
);
requestTypeRouter.delete(
  '/:id',
  authGuard,
  queryHandler(masterDataController.hardDelete.bind(masterDataController)),
);
requestTypeRouter.get(
  '/:id/history',
  authGuard,
  requirePermission(PERMISSIONS.MASTERDATA_HISTORY_VIEW),
  queryHandler(masterDataController.getHistory('request_type')),
);
masterDataRouter.use('/request-types', requestTypeRouter);

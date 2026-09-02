import mongoose, { type Model, type Document } from 'mongoose';
import {
  BranchModel,
  BuildingModel,
  FloorModel,
  RoomModel,
  DepartmentModel,
  CategoryModel,
  PropertyTypeModel,
  StatusFlowModel,
  RequestTypeModel,
  SupplierModel,
  MasterDataHistoryModel,
  type MasterDataHistoryDocument,
} from './masterdata.model.js';
import { AuditLogModel } from '../audit/audit.model.js';
import { MASTERDATA_EVENT } from '@am-pms/shared-constants';
import { NotFoundError, MethodNotAllowedError, ValidationError } from '../../common/utils/errors.js';
import { runInTransactionContext } from '../../common/utils/async-context.js';

export const MASTER_DATA_MODELS: Record<string, Model<any>> = {
  branch: BranchModel,
  building: BuildingModel,
  floor: FloorModel,
  room: RoomModel,
  department: DepartmentModel,
  category: CategoryModel,
  property_type: PropertyTypeModel,
  status_flow: StatusFlowModel,
  request_type: RequestTypeModel,
  supplier: SupplierModel,
};

export class MasterDataService {
  private getModel(entityKey: string): Model<any> {
    const model = MASTER_DATA_MODELS[entityKey.toLowerCase()];
    if (!model) {
      throw new NotFoundError(`Master data entity type '${entityKey}' not found`);
    }
    return model;
  }

  /**
   * List master data records with filtering, pagination, and active filtering
   */
  async list(entityKey: string, query: Record<string, any> = {}) {
    const model = this.getModel(entityKey);
    const { page = 1, limit = 50, sort = 'createdAt', order = 'desc', ...filters } = query;

    const mongoFilter: Record<string, any> = {};
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== '') {
        if (v === 'true') mongoFilter[k] = true;
        else if (v === 'false') mongoFilter[k] = false;
        else mongoFilter[k] = v;
      }
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sortObj: Record<string, any> = { [sort as string]: order === 'asc' ? 1 : -1 };

    const [items, total] = await Promise.all([
      model.find(mongoFilter).sort(sortObj).skip(skip).limit(Number(limit)).exec(),
      model.countDocuments(mongoFilter),
    ]);

    return {
      items,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  }

  /**
   * Get single master data record by ID
   */
  async getById(entityKey: string, id: string) {
    const model = this.getModel(entityKey);
    const item = await model.findById(id).exec();
    if (!item) {
      throw new NotFoundError(`${entityKey} not found`);
    }
    return item;
  }

  /**
   * Create master data record with initial version 1 and history entry (FR-MD-06)
   */
  async create(
    entityKey: string,
    data: any,
    userId: string,
    ipAddress?: string,
    requestId?: string,
  ) {
    const reqId = requestId || 'internal';
    const model = this.getModel(entityKey);
    const session = await mongoose.startSession();
    try {
      let createdDoc: any;

      await session.withTransaction(async () => {
        await runInTransactionContext({ session, requestId: reqId }, async () => {
          const [doc] = await model.create(
            [
              {
                ...data,
                version: 1,
                isActive: true,
                createdBy: userId,
                updatedBy: userId,
              },
            ],
            { session },
          );

          createdDoc = doc;

          // Audit log entry
          await AuditLogModel.create(
            [
              {
                actor: userId,
                action: MASTERDATA_EVENT.CREATED,
                entityType: model.modelName,
                entityId: doc._id,
                afterValue: doc.toObject(),
                timestamp: new Date(),
                ipAddress,
                requestId: reqId,
              },
            ],
            { session },
          );

          // Unified MasterDataHistory entry (FR-MD-06)
          await MasterDataHistoryModel.create(
            [
              {
                entityType: model.modelName,
                entityId: doc._id,
                version: 1,
                action: 'create',
                diff: {},
                snapshot: doc.toObject(),
                performedBy: userId,
                timestamp: new Date(),
              },
            ],
            { session },
          );
        });
      });

      return createdDoc;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Update master data record with version increment and history diff (FR-MD-06)
   */
  async update(
    entityKey: string,
    id: string,
    data: any,
    userId: string,
    ipAddress?: string,
    requestId?: string,
  ) {
    const reqId = requestId || 'internal';
    const model = this.getModel(entityKey);
    const existing = await model.findById(id);
    if (!existing) {
      throw new NotFoundError(`${entityKey} not found`);
    }

    const session = await mongoose.startSession();
    try {
      let updatedDoc: any;

      await session.withTransaction(async () => {
        await runInTransactionContext({ session, requestId: reqId }, async () => {
          const newVersion = (existing.version || 1) + 1;
          const before = existing.toObject();

          const doc = await model.findByIdAndUpdate(
            id,
            {
              ...data,
              version: newVersion,
              updatedBy: userId,
            },
            { new: true, session },
          );

          if (!doc) throw new NotFoundError(`${entityKey} not found`);
          updatedDoc = doc;

          const after = doc.toObject();

          // Compute field-level diff
          const diff: Record<string, { before: any; after: any }> = {};
          for (const key of Object.keys(data)) {
            if (JSON.stringify((before as any)[key]) !== JSON.stringify((after as any)[key])) {
              diff[key] = { before: (before as any)[key], after: (after as any)[key] };
            }
          }

          // Audit log entry
          await AuditLogModel.create(
            [
              {
                actor: userId,
                action: MASTERDATA_EVENT.UPDATED,
                entityType: model.modelName,
                entityId: doc._id,
                beforeValue: before,
                afterValue: after,
                timestamp: new Date(),
                ipAddress,
                requestId: reqId,
              },
            ],
            { session },
          );

          // Unified MasterDataHistory entry (FR-MD-06)
          await MasterDataHistoryModel.create(
            [
              {
                entityType: model.modelName,
                entityId: doc._id,
                version: newVersion,
                action: 'update',
                diff,
                snapshot: after,
                performedBy: userId,
                timestamp: new Date(),
              },
            ],
            { session },
          );
        });
      });

      return updatedDoc;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Deactivate master data record (FR-MD-05 Soft delete only)
   */
  async deactivate(
    entityKey: string,
    id: string,
    userId: string,
    ipAddress?: string,
    requestId?: string,
  ) {
    const reqId = requestId || 'internal';
    const model = this.getModel(entityKey);
    const existing = await model.findById(id);
    if (!existing) {
      throw new NotFoundError(`${entityKey} not found`);
    }

    const session = await mongoose.startSession();
    try {
      let updatedDoc: any;

      await session.withTransaction(async () => {
        await runInTransactionContext({ session, requestId: reqId }, async () => {
          const newVersion = (existing.version || 1) + 1;
          const before = existing.toObject();

          const doc = await model.findByIdAndUpdate(
            id,
            {
              isActive: false,
              version: newVersion,
              updatedBy: userId,
            },
            { new: true, session },
          );

          if (!doc) throw new NotFoundError(`${entityKey} not found`);
          updatedDoc = doc;

          // Audit log entry
          await AuditLogModel.create(
            [
              {
                actor: userId,
                action: MASTERDATA_EVENT.DEACTIVATED,
                entityType: model.modelName,
                entityId: doc._id,
                beforeValue: before,
                afterValue: doc.toObject(),
                timestamp: new Date(),
                ipAddress,
                requestId: reqId,
              },
            ],
            { session },
          );

          // Unified MasterDataHistory entry (FR-MD-06)
          await MasterDataHistoryModel.create(
            [
              {
                entityType: model.modelName,
                entityId: doc._id,
                version: newVersion,
                action: 'deactivate',
                diff: { isActive: { before: true, after: false } },
                snapshot: doc.toObject(),
                performedBy: userId,
                timestamp: new Date(),
              },
            ],
            { session },
          );
        });
      });

      return updatedDoc;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Hard deletes are strictly prohibited by FR-MD-05.
   */
  async hardDelete() {
    throw new MethodNotAllowedError(
      'Hard deletes are prohibited on master data entities per FR-MD-05. Use deactivate endpoint instead.',
    );
  }

  /**
   * Get version history for any master data entity (FR-MD-06)
   */
  async getHistory(entityKey: string, id: string): Promise<MasterDataHistoryDocument[]> {
    const model = this.getModel(entityKey);
    return MasterDataHistoryModel.find({
      entityType: model.modelName,
      entityId: id,
    })
      .sort({ version: -1 })
      .exec();
  }
}

export const masterDataService = new MasterDataService();

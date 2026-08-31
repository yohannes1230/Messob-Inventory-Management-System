import mongoose, { type ClientSession } from 'mongoose';
import { CustomFieldModel, type CustomFieldDocument } from './customfield.model.js';
import { PropertyTypeModel } from '../masterdata/masterdata.model.js';
import { MasterDataHistoryModel } from '../masterdata/masterdata.model.js';
import { AuditLogModel } from '../audit/audit.model.js';
import { CUSTOMFIELD_EVENT } from '@am-pms/shared-constants';
import { ValidationError, NotFoundError } from '../../common/utils/errors.js';
import { runInTransactionContext } from '../../common/utils/async-context.js';
import type { ICustomFieldValidationResult } from '@am-pms/shared-types';

export class CustomFieldService {
  /**
   * Server-side validation of runtime custom field values against definitions (FR-CF-05).
   * Validates all 6 data types, requiredness, options enum, and custom regex constraints.
   */
  async validateValues(
    propertyTypeId: string,
    values: Record<string, any>,
  ): Promise<ICustomFieldValidationResult> {
    const fields = await CustomFieldModel.find({
      propertyType: propertyTypeId,
      isActive: true,
    }).exec();

    const errors: Record<string, string> = {};

    for (const field of fields) {
      const val = values[field.name];

      // Required check
      if (field.isRequired) {
        if (val === undefined || val === null || val === '') {
          errors[field.name] = `Field '${field.label}' is required`;
          continue;
        }
      }

      // If value is omitted and not required, skip type validation
      if (val === undefined || val === null || val === '') {
        continue;
      }

      // Type-specific validation
      switch (field.dataType) {
        case 'text': {
          if (typeof val !== 'string') {
            errors[field.name] = `Field '${field.label}' must be a text string`;
          } else if (field.validationRule) {
            try {
              const regex = new RegExp(field.validationRule);
              if (!regex.test(val)) {
                errors[field.name] = `Field '${field.label}' does not match required pattern (${field.validationRule})`;
              }
            } catch {
              // Ignore invalid regex pattern stored in DB
            }
          }
          break;
        }

        case 'number': {
          const num = typeof val === 'number' ? val : Number(val);
          if (typeof val !== 'number' && isNaN(num)) {
            errors[field.name] = `Field '${field.label}' must be a valid number`;
          } else if (!Number.isFinite(num)) {
            errors[field.name] = `Field '${field.label}' must be a finite number`;
          }
          break;
        }

        case 'date': {
          const parsed = Date.parse(val);
          if (isNaN(parsed)) {
            errors[field.name] = `Field '${field.label}' must be a valid ISO date`;
          }
          break;
        }

        case 'boolean': {
          if (typeof val !== 'boolean' && val !== 'true' && val !== 'false') {
            errors[field.name] = `Field '${field.label}' must be a boolean`;
          }
          break;
        }

        case 'single_select': {
          if (typeof val !== 'string' || !field.options?.includes(val)) {
            errors[field.name] = `Field '${field.label}' must be one of: ${(field.options || []).join(', ')}`;
          }
          break;
        }

        case 'multi_select': {
          if (!Array.isArray(val)) {
            errors[field.name] = `Field '${field.label}' must be an array of selected options`;
          } else {
            const invalidItems = val.filter((item) => !field.options?.includes(item));
            if (invalidItems.length > 0) {
              errors[field.name] = `Invalid selection: ${invalidItems.join(', ')}. Allowed: ${(field.options || []).join(', ')}`;
            }
          }
          break;
        }

        case 'attachment': {
          if (typeof val !== 'object' || (!val.url && typeof val !== 'string')) {
            errors[field.name] = `Field '${field.label}' must be an attachment object containing a valid url`;
          }
          break;
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationError('Custom field validation failed', errors);
    }

    return { isValid: true, errors: {} };
  }

  /**
   * Create a custom field attached to a PropertyType (FR-CF-01).
   */
  async createField(
    data: any,
    userId: string,
    ipAddress?: string,
    requestId?: string,
  ): Promise<CustomFieldDocument> {
    const reqId = requestId || 'internal';
    const propertyType = await PropertyTypeModel.findById(data.propertyType);
    if (!propertyType) {
      throw new NotFoundError('PropertyType not found');
    }

    const session = await mongoose.startSession();
    try {
      let createdDoc: CustomFieldDocument | undefined;

      await session.withTransaction(async () => {
        await runInTransactionContext({ session, requestId: reqId }, async () => {
          const [doc] = await CustomFieldModel.create(
            [
              {
                ...data,
                version: 1,
                createdBy: userId,
                updatedBy: userId,
              },
            ],
            { session },
          );

          createdDoc = doc!;

          // Link to PropertyType customFieldDefs
          await PropertyTypeModel.updateOne(
            { _id: data.propertyType },
            { $addToSet: { customFieldDefs: doc!._id } },
            { session },
          );

          // Audit log entry
          await AuditLogModel.create(
            [
              {
                actor: userId,
                action: CUSTOMFIELD_EVENT.CREATED,
                entityType: 'CustomField',
                entityId: doc!._id,
                afterValue: doc!.toObject(),
                timestamp: new Date(),
                ipAddress,
                requestId: reqId,
              },
            ],
            { session },
          );

          // MasterDataHistory entry
          await MasterDataHistoryModel.create(
            [
              {
                entityType: 'CustomField',
                entityId: doc!._id,
                version: 1,
                action: 'create',
                diff: {},
                snapshot: doc!.toObject(),
                performedBy: userId,
                timestamp: new Date(),
              },
            ],
            { session },
          );
        });
      });

      return createdDoc!;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Update custom field definition (FR-CF-06).
   */
  async updateField(
    id: string,
    data: any,
    userId: string,
    ipAddress?: string,
    requestId?: string,
  ): Promise<CustomFieldDocument> {
    const reqId = requestId || 'internal';
    const existing = await CustomFieldModel.findById(id);
    if (!existing) {
      throw new NotFoundError('CustomField not found');
    }

    const session = await mongoose.startSession();
    try {
      let updatedDoc: CustomFieldDocument | undefined;

      await session.withTransaction(async () => {
        await runInTransactionContext({ session, requestId: reqId }, async () => {
          const newVersion = existing.version + 1;
          const before = existing.toObject();

          const doc = await CustomFieldModel.findByIdAndUpdate(
            id,
            {
              ...data,
              version: newVersion,
              updatedBy: userId,
            },
            { new: true, session },
          );

          if (!doc) throw new NotFoundError('CustomField not found');
          updatedDoc = doc;

          const after = doc.toObject();

          // Field-level diff
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
                action: CUSTOMFIELD_EVENT.UPDATED,
                entityType: 'CustomField',
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

          // MasterDataHistory entry
          await MasterDataHistoryModel.create(
            [
              {
                entityType: 'CustomField',
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

      return updatedDoc!;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Deactivate custom field (FR-CF-06 / FR-MD-05).
   */
  async deactivateField(
    id: string,
    userId: string,
    ipAddress?: string,
    requestId?: string,
  ): Promise<CustomFieldDocument> {
    const reqId = requestId || 'internal';
    const existing = await CustomFieldModel.findById(id);
    if (!existing) {
      throw new NotFoundError('CustomField not found');
    }

    const session = await mongoose.startSession();
    try {
      let updatedDoc: CustomFieldDocument | undefined;

      await session.withTransaction(async () => {
        await runInTransactionContext({ session, requestId: reqId }, async () => {
          const newVersion = existing.version + 1;
          const before = existing.toObject();

          const doc = await CustomFieldModel.findByIdAndUpdate(
            id,
            {
              isActive: false,
              version: newVersion,
              updatedBy: userId,
            },
            { new: true, session },
          );

          if (!doc) throw new NotFoundError('CustomField not found');
          updatedDoc = doc;

          // Audit log entry
          await AuditLogModel.create(
            [
              {
                actor: userId,
                action: CUSTOMFIELD_EVENT.DEACTIVATED,
                entityType: 'CustomField',
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

          // MasterDataHistory entry
          await MasterDataHistoryModel.create(
            [
              {
                entityType: 'CustomField',
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

      return updatedDoc!;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Get fields for property type
   */
  async getByPropertyType(propertyTypeId: string): Promise<CustomFieldDocument[]> {
    return CustomFieldModel.find({ propertyType: propertyTypeId, isActive: true })
      .sort({ order: 1, createdAt: 1 })
      .exec();
  }
}

export const customFieldService = new CustomFieldService();

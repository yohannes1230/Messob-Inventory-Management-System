import {
  PropertyTypeModel,
  BranchModel,
  CategoryModel,
} from '../masterdata/masterdata.model.js';
import { assetService } from './asset.service.js';
import { customFieldService } from '../customfields/customfield.service.js';
import { AuditLogModel } from '../audit/audit.model.js';
import { ASSET_EVENT } from '@am-pms/shared-constants';
import { getTransactionSession, getTransactionRequestId } from '../../common/utils/async-context.js';

export interface BulkImportRowInput {
  name: string;
  propertyTypeName: string;
  branchCode: string;
  value?: number;
  currency?: string;
  purchaseDate?: string;
  supplierName?: string;
  warrantyExpiry?: string;
  customFields?: Record<string, any>;
}

export interface BulkRowValidationReport {
  rowIndex: number;
  data: BulkImportRowInput;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  resolvedData?: {
    propertyTypeId: string;
    categoryId: string;
    branchId: string;
  };
}

export class BulkImportService {
  /**
   * Dry-run pre-import validation report (FR-REG-04).
   * Validates each row without committing any writes.
   */
  async validateRows(rows: BulkImportRowInput[]): Promise<{
    totalRows: number;
    validRowsCount: number;
    invalidRowsCount: number;
    rowReports: BulkRowValidationReport[];
  }> {
    const rowReports: BulkRowValidationReport[] = [];
    let validRowsCount = 0;
    let invalidRowsCount = 0;

    // Cache master data lookups across batch to prevent N+1 queries
    const propertyTypeCache = new Map<string, any>();
    const branchCache = new Map<string, any>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      const errors: string[] = [];
      const warnings: string[] = [];
      let resolvedPropertyType: any = null;
      let resolvedBranch: any = null;

      // 1. Validate name
      if (!row.name || !row.name.trim()) {
        errors.push('Asset name is required');
      }

      // 2. Validate PropertyType lookup
      if (!row.propertyTypeName) {
        errors.push('Property type name is required');
      } else {
        const ptKey = row.propertyTypeName.trim().toLowerCase();
        if (propertyTypeCache.has(ptKey)) {
          resolvedPropertyType = propertyTypeCache.get(ptKey);
        } else {
          resolvedPropertyType = await PropertyTypeModel.findOne({
            name: { $regex: new RegExp(`^${row.propertyTypeName.trim()}$`, 'i') },
            isActive: true,
          }).exec();
          propertyTypeCache.set(ptKey, resolvedPropertyType);
        }

        if (!resolvedPropertyType) {
          errors.push(`PropertyType '${row.propertyTypeName}' does not exist or is inactive`);
        }
      }

      // 3. Validate Branch lookup
      if (!row.branchCode) {
        errors.push('Branch code is required');
      } else {
        const brKey = row.branchCode.trim().toUpperCase();
        if (branchCache.has(brKey)) {
          resolvedBranch = branchCache.get(brKey);
        } else {
          resolvedBranch = await BranchModel.findOne({
            code: brKey,
            isActive: true,
          }).exec();
          branchCache.set(brKey, resolvedBranch);
        }

        if (!resolvedBranch) {
          errors.push(`Branch code '${row.branchCode}' does not exist or is inactive`);
        }
      }

      // 4. Validate Custom Fields if PropertyType is resolved
      if (resolvedPropertyType) {
        try {
          const cfResult = await customFieldService.validateValues(
            resolvedPropertyType._id.toString(),
            row.customFields || {},
          );
          if (!cfResult.isValid) {
            for (const [field, msg] of Object.entries(cfResult.errors)) {
              errors.push(`Custom field '${field}': ${msg}`);
            }
          }
        } catch (err: any) {
          if (err.details && typeof err.details === 'object') {
            for (const [field, msg] of Object.entries(err.details)) {
              errors.push(`Custom field '${field}': ${msg}`);
            }
          } else {
            errors.push(err.message || 'Custom field validation failed');
          }
        }
      }

      // 5. Warnings (e.g. 0 value or missing purchase date)
      if (row.value === undefined || row.value === 0) {
        warnings.push('Asset value is 0 or not specified');
      }
      if (!row.purchaseDate) {
        warnings.push('Purchase date is omitted');
      }

      const isValid = errors.length === 0;
      if (isValid) validRowsCount++;
      else invalidRowsCount++;

      rowReports.push({
        rowIndex: i + 1,
        data: row,
        isValid,
        errors,
        warnings,
        resolvedData: isValid
          ? {
              propertyTypeId: resolvedPropertyType._id.toString(),
              categoryId: resolvedPropertyType.category.toString(),
              branchId: resolvedBranch._id.toString(),
            }
          : undefined,
      });
    }

    return {
      totalRows: rows.length,
      validRowsCount,
      invalidRowsCount,
      rowReports,
    };
  }

  /**
   * Commits bulk import batch, creating assets and logging audit entry.
   */
  async commitBatch(
    rows: BulkImportRowInput[],
    userId?: string,
    ipAddress?: string,
  ): Promise<{
    importedCount: number;
    failedCount: number;
    assets: any[];
    validationReport: any;
  }> {
    const session = getTransactionSession();
    const validation = await this.validateRows(rows);

    if (validation.invalidRowsCount > 0) {
      return {
        importedCount: 0,
        failedCount: validation.invalidRowsCount,
        assets: [],
        validationReport: validation,
      };
    }

    const createdAssets: any[] = [];

    for (const report of validation.rowReports) {
      const { data, resolvedData } = report;
      const asset = await assetService.create(
        {
          name: data.name,
          propertyType: resolvedData!.propertyTypeId,
          category: resolvedData!.categoryId,
          currentLocation: { branch: resolvedData!.branchId },
          value: data.value || 0,
          currency: data.currency || 'ETB',
          purchaseDate: data.purchaseDate,
          customFieldValues: data.customFields || {},
        },
        userId,
        ipAddress,
      );
      createdAssets.push(asset);
    }

    if (userId) {
      await AuditLogModel.create(
        [
          {
            actor: userId,
            action: ASSET_EVENT.IMPORTED,
            entityType: 'Asset',
            entityId: createdAssets[0]?._id || new (await import('mongoose')).default.Types.ObjectId(),
            afterValue: {
              batchSize: createdAssets.length,
              assetCodes: createdAssets.map((a) => a.assetCode),
            },
            ipAddress,
            requestId: getTransactionRequestId() || 'req-' + Date.now(),
            timestamp: new Date(),
          },
        ],
        { session },
      );
    }

    return {
      importedCount: createdAssets.length,
      failedCount: 0,
      assets: createdAssets,
      validationReport: validation,
    };
  }
}

export const bulkImportService = new BulkImportService();

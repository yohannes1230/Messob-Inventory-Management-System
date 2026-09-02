import mongoose, { type ClientSession } from 'mongoose';
import { AssetModel, type AssetDocument } from './asset.model.js';
import { assetCodeService } from './asset-code.service.js';
import { customFieldService } from '../customfields/customfield.service.js';
import {
  PropertyTypeModel,
  CategoryModel,
  BranchModel,
} from '../masterdata/masterdata.model.js';
import { AuditLogModel } from '../audit/audit.model.js';
import { ASSET_EVENT, ASSET_STATUS } from '@am-pms/shared-constants';
import { ValidationError, NotFoundError } from '../../common/utils/errors.js';
import { getTransactionSession, getTransactionRequestId } from '../../common/utils/async-context.js';

export class AssetService {
  /**
   * Registers a new asset with auto-code, custom field validation, QR payload, and audit logging.
   */
  async create(data: Record<string, any>, userId?: string, ipAddress?: string): Promise<AssetDocument> {
    const session = getTransactionSession();

    // 1. Resolve PropertyType & Category
    const propertyType = await PropertyTypeModel.findById(data.propertyType).session(session || null);
    if (!propertyType || !propertyType.isActive) {
      throw new ValidationError('Valid, active PropertyType is required');
    }

    const categoryId = data.category || propertyType.category;
    const category = await CategoryModel.findById(categoryId).session(session || null);
    if (!category || !category.isActive) {
      throw new ValidationError('Valid, active Category is required');
    }

    // 2. Validate Branch
    const branchId = data.currentLocation?.branch;
    if (!branchId) {
      throw new ValidationError('Current location branch is required');
    }
    const branch = await BranchModel.findById(branchId).session(session || null);
    if (!branch || !branch.isActive) {
      throw new ValidationError('Valid, active Branch is required');
    }

    // 3. Validate Custom Fields using Phase 2 CustomField validation engine (FR-CF-05, FR-REG-01)
    const validationResult = await customFieldService.validateValues(
      propertyType._id.toString(),
      data.customFieldValues || {},
    );
    if (!validationResult.isValid) {
      const firstErrorKey = Object.keys(validationResult.errors)[0]!;
      throw new ValidationError(
        `Custom field validation failed: ${validationResult.errors[firstErrorKey]}`,
        validationResult.errors,
      );
    }

    // 4. Auto-generate Unique Asset Code (FR-REG-02)
    const assetCode = await assetCodeService.generateCode({
      branchCode: branch.code,
      categoryCode: (category.name || 'GEN').substring(0, 4),
      propertyTypeCode: (propertyType.name || 'AST').substring(0, 3),
    });

    // 5. Generate QR Code and Barcode payload (FR-REG-03)
    const tempId = new mongoose.Types.ObjectId();
    const qrPayload = JSON.stringify({
      id: tempId.toString(),
      code: assetCode,
      name: data.name,
      url: `/assets/${tempId.toString()}`,
    });

    // 6. Create Asset Record
    const asset = new AssetModel({
      _id: tempId,
      ...data,
      assetCode,
      category: category._id,
      qrCode: qrPayload,
      barcodeFormat: data.barcodeFormat || 'CODE128',
      status: data.status || ASSET_STATUS.AVAILABLE,
      isActive: true,
      version: 1,
      createdBy: userId,
      updatedBy: userId,
    });

    await asset.save({ session });

    // 7. Audit Log (FR-AUD-01/02)
    if (userId) {
      await AuditLogModel.create(
        [
          {
            actor: userId,
            action: ASSET_EVENT.CREATED,
            entityType: 'Asset',
            entityId: asset._id,
            afterValue: asset.toObject(),
            ipAddress,
            requestId: getTransactionRequestId() || 'req-' + Date.now(),
            timestamp: new Date(),
          },
        ],
        { session },
      );
    }

    return asset;
  }

  /**
   * Retrieves asset by ID with populated master data references.
   */
  async getById(id: string): Promise<AssetDocument> {
    const asset = await AssetModel.findById(id)
      .populate('propertyType', 'name nameAm unitOfMeasure')
      .populate('category', 'name nameAm')
      .populate('currentLocation.branch', 'name nameAm code')
      .populate('currentLocation.building', 'name')
      .populate('currentLocation.room', 'name')
      .populate('supplier', 'name contact taxId')
      .populate('bundleChildren', 'assetCode name status')
      .populate('bundleParent', 'assetCode name status')
      .exec();

    if (!asset) {
      throw new NotFoundError(`Asset with ID '${id}' not found`);
    }

    return asset;
  }

  /**
   * Lists assets with pagination, search, and status/branch filters.
   */
  async list(query: Record<string, any> = {}) {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      branch,
      category,
      propertyType,
      custodianRef,
      sort = 'createdAt',
      order = 'desc',
    } = query;

    const filter: Record<string, any> = { isActive: true };

    if (status) filter.status = status;
    if (branch) filter['currentLocation.branch'] = branch;
    if (category) filter.category = category;
    if (propertyType) filter.propertyType = propertyType;
    if (custodianRef) filter['currentCustodian.ref'] = custodianRef;

    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [{ name: regex }, { assetCode: regex }];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sortObj: Record<string, any> = { [sort as string]: order === 'asc' ? 1 : -1 };

    const [items, total] = await Promise.all([
      AssetModel.find(filter)
        .populate('propertyType', 'name nameAm')
        .populate('category', 'name nameAm')
        .populate('currentLocation.branch', 'name code')
        .sort(sortObj)
        .skip(skip)
        .limit(Number(limit))
        .exec(),
      AssetModel.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)) || 1,
    };
  }

  /**
   * Updates an existing asset, validating custom fields if modified.
   */
  async update(id: string, data: Record<string, any>, userId?: string, ipAddress?: string): Promise<AssetDocument> {
    const session = getTransactionSession();
    const asset = await AssetModel.findById(id).session(session || null);
    if (!asset || !asset.isActive) {
      throw new NotFoundError(`Asset with ID '${id}' not found`);
    }

    const beforeSnapshot = asset.toObject();

    // Validate updated custom fields if provided
    if (data.customFieldValues) {
      const ptId = data.propertyType || asset.propertyType.toString();
      const validationResult = await customFieldService.validateValues(
        ptId,
        data.customFieldValues,
      );
      if (!validationResult.isValid) {
        const firstErrorKey = Object.keys(validationResult.errors)[0]!;
        throw new ValidationError(
          `Custom field validation failed: ${validationResult.errors[firstErrorKey]}`,
          validationResult.errors,
        );
      }
    }

    Object.assign(asset, data);
    asset.version += 1;
    asset.updatedBy = userId as any;

    await asset.save({ session });

    if (userId) {
      await AuditLogModel.create(
        [
          {
            actor: userId,
            action: ASSET_EVENT.UPDATED,
            entityType: 'Asset',
            entityId: asset._id,
            beforeValue: beforeSnapshot,
            afterValue: asset.toObject(),
            ipAddress,
            requestId: getTransactionRequestId() || 'req-' + Date.now(),
            timestamp: new Date(),
          },
        ],
        { session },
      );
    }

    return asset;
  }

  /**
   * Soft-deactivates an asset (FR-MD-05 convention).
   */
  async deactivate(id: string, userId?: string, ipAddress?: string): Promise<AssetDocument> {
    const session = getTransactionSession();
    const asset = await AssetModel.findById(id).session(session || null);
    if (!asset || !asset.isActive) {
      throw new NotFoundError(`Asset with ID '${id}' not found`);
    }

    const beforeSnapshot = asset.toObject();
    asset.isActive = false;
    asset.version += 1;
    asset.updatedBy = userId as any;
    await asset.save({ session });

    if (userId) {
      await AuditLogModel.create(
        [
          {
            actor: userId,
            action: ASSET_EVENT.DEACTIVATED,
            entityType: 'Asset',
            entityId: asset._id,
            beforeValue: beforeSnapshot,
            afterValue: asset.toObject(),
            ipAddress,
            requestId: getTransactionRequestId() || 'req-' + Date.now(),
            timestamp: new Date(),
          },
        ],
        { session },
      );
    }

    return asset;
  }

  /**
   * Attaches photos to an asset (FR-REG-05).
   */
  async attachPhotos(
    id: string,
    photos: { url: string; caption?: string }[],
    userId?: string,
    ipAddress?: string,
  ): Promise<AssetDocument> {
    const session = getTransactionSession();
    const asset = await AssetModel.findById(id).session(session || null);
    if (!asset || !asset.isActive) {
      throw new NotFoundError(`Asset with ID '${id}' not found`);
    }

    const beforeSnapshot = asset.toObject();
    asset.photos.push(...photos);
    asset.version += 1;
    asset.updatedBy = userId as any;
    await asset.save({ session });

    if (userId) {
      await AuditLogModel.create(
        [
          {
            actor: userId,
            action: ASSET_EVENT.PHOTO_ATTACHED,
            entityType: 'Asset',
            entityId: asset._id,
            beforeValue: beforeSnapshot,
            afterValue: asset.toObject(),
            ipAddress,
            requestId: getTransactionRequestId() || 'req-' + Date.now(),
            timestamp: new Date(),
          },
        ],
        { session },
      );
    }

    return asset;
  }

  /**
   * Attaches a child asset to a bundle parent (FR-ASG-05).
   */
  async attachBundleChild(
    parentId: string,
    childId: string,
    userId?: string,
    ipAddress?: string,
  ): Promise<{ parent: AssetDocument; child: AssetDocument }> {
    const session = getTransactionSession();

    if (parentId === childId) {
      throw new ValidationError('An asset cannot be bundled to itself');
    }

    const [parent, child] = await Promise.all([
      AssetModel.findById(parentId).session(session || null),
      AssetModel.findById(childId).session(session || null),
    ]);

    if (!parent || !parent.isActive) throw new NotFoundError(`Parent asset '${parentId}' not found`);
    if (!child || !child.isActive) throw new NotFoundError(`Child asset '${childId}' not found`);

    if (child.bundleParent) {
      throw new ValidationError(`Child asset '${child.assetCode}' already belongs to parent bundle '${child.bundleParent}'`);
    }

    // Update parent
    parent.isBundleParent = true;
    if (!parent.bundleChildren.some((id) => id.toString() === childId)) {
      parent.bundleChildren.push(child._id);
    }
    parent.version += 1;
    await parent.save({ session });

    // Update child
    child.bundleParent = parent._id;
    child.version += 1;
    await child.save({ session });

    if (userId) {
      await AuditLogModel.create(
        [
          {
            actor: userId,
            action: ASSET_EVENT.BUNDLE_ATTACHED,
            entityType: 'Asset',
            entityId: parent._id,
            afterValue: { childId: child._id, parentId: parent._id },
            ipAddress,
            requestId: getTransactionRequestId() || 'req-' + Date.now(),
            timestamp: new Date(),
          },
        ],
        { session },
      );
    }

    return { parent, child };
  }

  /**
   * Detaches a child asset from its bundle parent (FR-ASG-05).
   */
  async detachBundleChild(
    parentId: string,
    childId: string,
    userId?: string,
    ipAddress?: string,
  ): Promise<{ parent: AssetDocument; child: AssetDocument }> {
    const session = getTransactionSession();

    const [parent, child] = await Promise.all([
      AssetModel.findById(parentId).session(session || null),
      AssetModel.findById(childId).session(session || null),
    ]);

    if (!parent || !parent.isActive) throw new NotFoundError(`Parent asset '${parentId}' not found`);
    if (!child || !child.isActive) throw new NotFoundError(`Child asset '${childId}' not found`);

    parent.bundleChildren = parent.bundleChildren.filter((id) => id.toString() !== childId);
    if (parent.bundleChildren.length === 0) {
      parent.isBundleParent = false;
    }
    parent.version += 1;
    await parent.save({ session });

    child.bundleParent = undefined;
    child.version += 1;
    await child.save({ session });

    if (userId) {
      await AuditLogModel.create(
        [
          {
            actor: userId,
            action: ASSET_EVENT.BUNDLE_DETACHED,
            entityType: 'Asset',
            entityId: parent._id,
            afterValue: { detachedChildId: child._id, remainingChildren: parent.bundleChildren },
            ipAddress,
            requestId: getTransactionRequestId() || 'req-' + Date.now(),
            timestamp: new Date(),
          },
        ],
        { session },
      );
    }

    return { parent, child };
  }
}

export const assetService = new AssetService();

import mongoose from 'mongoose';
import { RequestModel, type RequestDocument } from './request.model.js';
import { requestNumberService } from './request-number.service.js';
import { RequestTypeModel } from '../masterdata/masterdata.model.js';
import { AssetModel } from '../assets/asset.model.js';
import { AuditLogModel } from '../audit/audit.model.js';
import {
  REQUEST_CATEGORY,
  REQUEST_STATUS,
  REQUEST_EVENT,
  RequestCategory,
  PERMISSIONS,
} from '@am-pms/shared-constants';
import {
  CreateRequestDTO,
  ReportIssueDTO,
  RequestReturnDTO,
  CancelRequestDTO,
} from '@am-pms/shared-types';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from '../../common/utils/errors.js';
import {
  getTransactionSession,
  getTransactionRequestId,
} from '../../common/utils/async-context.js';
import { emitRequestStatusChange } from '../../sockets/index.js';

export class RequestService {
  /**
   * Mapping table between Request discriminator `type` and allowed `RequestType.module`.
   * Enforces that foreign key `requestType` and discriminator `type` never disagree.
   */
  private static readonly VALID_MODULES_FOR_TYPE: Record<RequestCategory, string[]> = {
    [REQUEST_CATEGORY.ASSET_ALLOCATION]: ['assignment', 'new_asset'],
    [REQUEST_CATEGORY.RETURN]: ['assignment'],
    [REQUEST_CATEGORY.TRANSFER]: ['transfer'],
    [REQUEST_CATEGORY.DAMAGE_LOSS]: ['maintenance'],
  };

  /**
   * Creates a new Request (Asset Allocation, Return, Transfer, or Issue).
   * Validates and/or derives `type` against `requestType.module` at write time.
   */
  async createRequest(
    dto: CreateRequestDTO,
    userId: string,
    ipAddress?: string,
  ): Promise<RequestDocument> {
    const session = getTransactionSession();

    if (!mongoose.Types.ObjectId.isValid(dto.requestTypeId)) {
      throw new ValidationError(`Invalid requestTypeId '${dto.requestTypeId}'`);
    }

    const requestTypeDoc = await RequestTypeModel.findById(dto.requestTypeId).session(
      session || null,
    );
    if (!requestTypeDoc || !requestTypeDoc.isActive) {
      throw new ValidationError('Invalid or inactive request type');
    }

    let finalType: RequestCategory;

    if (dto.type) {
      // Validate that specified type matches the RequestType module
      const allowedModules = RequestService.VALID_MODULES_FOR_TYPE[dto.type];
      if (!allowedModules || !allowedModules.includes(requestTypeDoc.module)) {
        throw new ValidationError(
          `Request type '${requestTypeDoc.name}' (module: '${requestTypeDoc.module}') cannot be used for '${dto.type}' requests.`,
        );
      }
      finalType = dto.type;
    } else {
      // Derive discriminator type automatically from requestType.module
      switch (requestTypeDoc.module) {
        case 'assignment':
        case 'new_asset':
          finalType = REQUEST_CATEGORY.ASSET_ALLOCATION;
          break;
        case 'transfer':
          finalType = REQUEST_CATEGORY.TRANSFER;
          break;
        case 'maintenance':
          finalType = REQUEST_CATEGORY.DAMAGE_LOSS;
          break;
        default:
          finalType = REQUEST_CATEGORY.ASSET_ALLOCATION;
      }
    }

    // Generate atomic sequential human-facing request number (REQ-YYYY-XXXXX)
    const requestNumber = await requestNumberService.generateRequestNumber(session);

    const request = new RequestModel({
      requestNumber,
      type: finalType,
      requestType: requestTypeDoc._id,
      requestor: new mongoose.Types.ObjectId(userId),
      targetAsset: dto.targetAsset ? new mongoose.Types.ObjectId(dto.targetAsset) : null,
      targetPropertyType: dto.targetPropertyType
        ? new mongoose.Types.ObjectId(dto.targetPropertyType)
        : null,
      payload: dto.payload || {},
      status: REQUEST_STATUS.SUBMITTED,
      workflowInstance: null, // Ready for Phase 5 workflow engine
      createdBy: new mongoose.Types.ObjectId(userId),
      updatedBy: new mongoose.Types.ObjectId(userId),
      version: 1,
    });

    await request.save({ session: session || undefined });

    // Write audit log entry
    if (userId) {
      await AuditLogModel.create(
        [
          {
            actor: userId,
            action: REQUEST_EVENT.CREATED,
            entityType: 'Request',
            entityId: request._id,
            afterValue: request.toObject(),
            ipAddress,
            requestId: getTransactionRequestId() || 'req-' + Date.now(),
            timestamp: new Date(),
          },
        ],
        { session: session || undefined },
      );

      // Dispatch real-time in-app status-change notification (FR-ESS-07)
      emitRequestStatusChange(userId, {
        requestId: request._id.toString(),
        requestNumber: request.requestNumber,
        type: request.type,
        status: request.status,
        message: `Request ${request.requestNumber} submitted successfully`,
      });
    }

    return request;
  }

  /**
   * Reports an issue/damage/loss on an asset (FR-ESS-05).
   * Creates a canonical Request in the `requests` collection with type 'damage_loss'.
   */
  async reportIssue(
    assetId: string,
    dto: ReportIssueDTO,
    userId: string,
    ipAddress?: string,
  ): Promise<RequestDocument> {
    const session = getTransactionSession();

    if (!mongoose.Types.ObjectId.isValid(assetId)) {
      throw new ValidationError(`Invalid assetId '${assetId}'`);
    }

    const asset = await AssetModel.findById(assetId).session(session || null);
    if (!asset || !asset.isActive) {
      throw new NotFoundError(`Asset '${assetId}' not found`);
    }

    // Find active maintenance request type
    let maintenanceType = await RequestTypeModel.findOne({
      module: 'maintenance',
      isActive: true,
    }).session(session || null);

    if (!maintenanceType) {
      maintenanceType = await RequestTypeModel.findOne({
        isActive: true,
      }).session(session || null);
    }

    if (!maintenanceType) {
      throw new ValidationError('No active RequestType configured for maintenance/issue reports');
    }

    const requestNumber = await requestNumberService.generateRequestNumber(session);

    const request = new RequestModel({
      requestNumber,
      type: REQUEST_CATEGORY.DAMAGE_LOSS,
      requestType: maintenanceType._id,
      requestor: new mongoose.Types.ObjectId(userId),
      targetAsset: asset._id,
      targetPropertyType: asset.propertyType,
      payload: {
        issueType: dto.issueType,
        severity: dto.severity,
        description: dto.description,
        incidentDate: dto.incidentDate || new Date().toISOString(),
        photos: dto.photos || [],
      },
      status: REQUEST_STATUS.SUBMITTED,
      workflowInstance: null,
      createdBy: new mongoose.Types.ObjectId(userId),
      updatedBy: new mongoose.Types.ObjectId(userId),
      version: 1,
    });

    await request.save({ session: session || undefined });

    // Write audit log entry
    if (userId) {
      await AuditLogModel.create(
        [
          {
            actor: userId,
            action: REQUEST_EVENT.ISSUE_REPORTED,
            entityType: 'Request',
            entityId: request._id,
            afterValue: request.toObject(),
            ipAddress,
            requestId: getTransactionRequestId() || 'req-' + Date.now(),
            timestamp: new Date(),
          },
        ],
        { session: session || undefined },
      );

      // Dispatch real-time in-app status-change notification (FR-ESS-07)
      emitRequestStatusChange(userId, {
        requestId: request._id.toString(),
        requestNumber: request.requestNumber,
        type: request.type,
        status: request.status,
        message: `Damage/loss report ${request.requestNumber} submitted`,
      });
    }

    return request;
  }

  /**
   * Initiates return request for an assigned asset (FR-ESS-04).
   * Creates a canonical Request with type 'return' in the `requests` collection.
   */
  async requestReturn(
    assetId: string,
    dto: RequestReturnDTO,
    userId: string,
    ipAddress?: string,
  ): Promise<RequestDocument> {
    const session = getTransactionSession();

    if (!mongoose.Types.ObjectId.isValid(assetId)) {
      throw new ValidationError(`Invalid assetId '${assetId}'`);
    }

    const asset = await AssetModel.findById(assetId).session(session || null);
    if (!asset || !asset.isActive) {
      throw new NotFoundError(`Asset '${assetId}' not found`);
    }

    // Find active assignment request type
    let assignmentType = await RequestTypeModel.findOne({
      module: 'assignment',
      isActive: true,
    }).session(session || null);

    if (!assignmentType) {
      assignmentType = await RequestTypeModel.findOne({
        isActive: true,
      }).session(session || null);
    }

    if (!assignmentType) {
      throw new ValidationError('No active RequestType configured for return requests');
    }

    const requestNumber = await requestNumberService.generateRequestNumber(session);

    const request = new RequestModel({
      requestNumber,
      type: REQUEST_CATEGORY.RETURN,
      requestType: assignmentType._id,
      requestor: new mongoose.Types.ObjectId(userId),
      targetAsset: asset._id,
      targetPropertyType: asset.propertyType,
      payload: {
        reason: dto.reason,
        conditionNotes: dto.conditionNotes || '',
        proposedReturnDate: dto.proposedReturnDate || new Date().toISOString(),
      },
      status: REQUEST_STATUS.SUBMITTED,
      workflowInstance: null,
      createdBy: new mongoose.Types.ObjectId(userId),
      updatedBy: new mongoose.Types.ObjectId(userId),
      version: 1,
    });

    await request.save({ session: session || undefined });

    // Write audit log entry
    if (userId) {
      await AuditLogModel.create(
        [
          {
            actor: userId,
            action: REQUEST_EVENT.RETURN_REQUESTED,
            entityType: 'Request',
            entityId: request._id,
            afterValue: request.toObject(),
            ipAddress,
            requestId: getTransactionRequestId() || 'req-' + Date.now(),
            timestamp: new Date(),
          },
        ],
        { session: session || undefined },
      );

      // Dispatch real-time in-app status-change notification (FR-ESS-07)
      emitRequestStatusChange(userId, {
        requestId: request._id.toString(),
        requestNumber: request.requestNumber,
        type: request.type,
        status: request.status,
        message: `Return request ${request.requestNumber} submitted`,
      });
    }

    return request;
  }

  /**
   * Retrieves requests submitted by the logged-in user (FR-ESS-07).
   */
  async getMyRequests(
    userId: string,
    query: {
      page?: number;
      limit?: number;
      status?: string;
      type?: string;
    } = {},
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {
      requestor: new mongoose.Types.ObjectId(userId),
    };

    if (query.status) {
      filter.status = query.status;
    }
    if (query.type) {
      filter.type = query.type;
    }

    const [items, total] = await Promise.all([
      RequestModel.find(filter)
        .populate('requestType', 'name module')
        .populate('targetAsset', 'assetCode name status')
        .populate('targetPropertyType', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      RequestModel.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Retrieves a single Request by ID with role-based access check (FR-ESS-07).
   */
  async getRequestById(
    requestId: string,
    user: { userId: string; permissions: string[] },
  ) {
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      throw new ValidationError(`Invalid requestId '${requestId}'`);
    }

    const request = await RequestModel.findById(requestId)
      .populate('requestType', 'name module')
      .populate('targetAsset', 'assetCode name status currentLocation')
      .populate('targetPropertyType', 'name')
      .populate('requestor', 'username email')
      .lean();

    if (!request) {
      throw new NotFoundError(`Request '${requestId}' not found`);
    }

    const isOwner = (request.requestor as any)?._id?.toString() === user.userId;
    const hasViewAll = user.permissions.includes(PERMISSIONS.REQUEST_VIEW_ALL);

    if (!isOwner && !hasViewAll) {
      throw new ForbiddenError('You do not have permission to view this request');
    }

    return request;
  }

  /**
   * Cancels a submitted or in_review request (FR-ESS-08).
   */
  async cancelRequest(
    requestId: string,
    dto: CancelRequestDTO,
    userId: string,
    ipAddress?: string,
  ): Promise<RequestDocument> {
    const session = getTransactionSession();

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      throw new ValidationError(`Invalid requestId '${requestId}'`);
    }

    const request = await RequestModel.findById(requestId).session(session || null);
    if (!request) {
      throw new NotFoundError(`Request '${requestId}' not found`);
    }

    if (request.requestor.toString() !== userId) {
      throw new ForbiddenError('You can only cancel your own requests');
    }

    if (
      request.status !== REQUEST_STATUS.SUBMITTED &&
      request.status !== REQUEST_STATUS.IN_REVIEW
    ) {
      throw new ValidationError(
        `Cannot cancel request in '${request.status}' status (must be submitted or in_review)`,
      );
    }

    const beforeValue = request.toObject();

    request.status = REQUEST_STATUS.CANCELLED;
    request.payload = {
      ...request.payload,
      cancellationReason: dto.reason || 'Cancelled by requestor',
      cancelledAt: new Date().toISOString(),
    };
    request.updatedBy = new mongoose.Types.ObjectId(userId);
    request.version += 1;

    await request.save({ session: session || undefined });

    // Write audit log entry
    await AuditLogModel.create(
      [
        {
          actor: userId,
          action: REQUEST_EVENT.CANCELLED,
          entityType: 'Request',
          entityId: request._id,
          beforeValue,
          afterValue: request.toObject(),
          ipAddress,
          requestId: getTransactionRequestId() || 'req-' + Date.now(),
          timestamp: new Date(),
        },
      ],
      { session: session || undefined },
    );

    // Dispatch real-time in-app status-change notification (FR-ESS-07)
    emitRequestStatusChange(userId, {
      requestId: request._id.toString(),
      requestNumber: request.requestNumber,
      type: request.type,
      status: request.status,
      message: `Request ${request.requestNumber} was cancelled`,
    });

    return request;
  }

  /**
   * Lists all requests across the organization (admin/officer view).
   */
  async listAllRequests(query: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    requestor?: string;
  } = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (query.status) filter.status = query.status;
    if (query.type) filter.type = query.type;
    if (query.requestor && mongoose.Types.ObjectId.isValid(query.requestor)) {
      filter.requestor = new mongoose.Types.ObjectId(query.requestor);
    }

    const [items, total] = await Promise.all([
      RequestModel.find(filter)
        .populate('requestType', 'name module')
        .populate('targetAsset', 'assetCode name status')
        .populate('targetPropertyType', 'name')
        .populate('requestor', 'username email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      RequestModel.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Summarizes active assets, pending requests, and open maintenance issues (FR-ESS-08).
   */
  async getPersonalDashboard(userId: string) {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const [assignedAssetsCount, pendingAssetsCount] = await Promise.all([
      AssetModel.countDocuments({
        'currentCustodian.ref': userObjectId,
        status: 'assigned',
        isActive: true,
      }),
      AssetModel.countDocuments({
        'currentCustodian.ref': userObjectId,
        status: 'pending_acceptance',
        isActive: true,
      }),
    ]);

    const [activeRequestsCount, openMaintenanceCount, recentRequests] = await Promise.all([
      RequestModel.countDocuments({
        requestor: userObjectId,
        status: { $in: [REQUEST_STATUS.SUBMITTED, REQUEST_STATUS.IN_REVIEW] },
      }),
      RequestModel.countDocuments({
        requestor: userObjectId,
        type: REQUEST_CATEGORY.DAMAGE_LOSS,
        status: { $in: [REQUEST_STATUS.SUBMITTED, REQUEST_STATUS.IN_REVIEW] },
      }),
      RequestModel.find({ requestor: userObjectId })
        .populate('requestType', 'name module')
        .populate('targetAsset', 'assetCode name status')
        .populate('targetPropertyType', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    return {
      activeAssetsCount: assignedAssetsCount,
      pendingAcceptanceCount: pendingAssetsCount,
      activeRequestsCount,
      openMaintenanceCount,
      recentRequests,
    };
  }
}

export const requestService = new RequestService();

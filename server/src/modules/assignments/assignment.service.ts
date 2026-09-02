import mongoose, { type ClientSession } from 'mongoose';
import { AssignmentModel, type AssignmentDocument } from './assignment.model.js';
import { AssetModel } from '../assets/asset.model.js';
import { AuditLogModel } from '../audit/audit.model.js';
import {
  ASSET_STATUS,
  ASSIGNMENT_STATUS,
  ASSIGNMENT_EVENT,
  ASSET_EVENT,
} from '@am-pms/shared-constants';
import { NotFoundError, ValidationError } from '../../common/utils/errors.js';
import { getTransactionSession, getTransactionRequestId } from '../../common/utils/async-context.js';

export interface CreateAssignmentInput {
  asset: string;
  custodian: {
    type: 'employee' | 'department' | 'room';
    ref: string;
  };
  assignedDate?: string;
  conditionAtAssignment?: string;
  notes?: string;
  includeBundleChildren?: boolean;
}

export interface ReturnAssignmentInput {
  returnedDate?: string;
  conditionAtReturn?: string;
  notes?: string;
  targetStatus?: 'available' | 'maintenance';
}

export interface TransferAssignmentInput {
  targetCustodian: {
    type: 'employee' | 'department' | 'room';
    ref: string;
  };
  transferReason: string;
  conditionAtTransfer?: string;
  notes?: string;
  includeBundleChildren?: boolean;
}

export class AssignmentService {
  /**
   * Creates a new assignment for an asset (and cascades to active bundle children).
   */
  async createAssignment(
    input: CreateAssignmentInput,
    userId?: string,
    ipAddress?: string,
  ): Promise<AssignmentDocument> {
    const session = getTransactionSession();
    const asset = await AssetModel.findById(input.asset).session(session || null);

    if (!asset || !asset.isActive) {
      throw new NotFoundError(`Asset '${input.asset}' not found`);
    }

    if (asset.status !== ASSET_STATUS.AVAILABLE) {
      throw new ValidationError(
        `Cannot assign asset '${asset.assetCode}': current status is '${asset.status}' (must be 'available')`,
      );
    }

    // 1. Create parent assignment
    const parentAssignment = new AssignmentModel({
      asset: asset._id,
      custodian: {
        type: input.custodian.type,
        ref: new mongoose.Types.ObjectId(input.custodian.ref),
      },
      assignedDate: input.assignedDate ? new Date(input.assignedDate) : new Date(),
      conditionAtAssignment: input.conditionAtAssignment || 'Good',
      notes: input.notes,
      status: ASSIGNMENT_STATUS.PENDING_ACCEPTANCE,
      createdBy: userId,
      updatedBy: userId,
      version: 1,
    });
    await parentAssignment.save({ session });

    // 2. Update asset status & currentCustodian
    asset.status = ASSET_STATUS.ASSIGNED;
    asset.currentCustodian = {
      type: input.custodian.type,
      ref: new mongoose.Types.ObjectId(input.custodian.ref),
    };
    asset.version += 1;
    await asset.save({ session });

    // 3. Cascade to bundle children if requested (FR-ASG-05)
    if (input.includeBundleChildren !== false && asset.bundleChildren.length > 0) {
      for (const childId of asset.bundleChildren) {
        const childAsset = await AssetModel.findById(childId).session(session || null);
        if (childAsset && childAsset.isActive && childAsset.status === ASSET_STATUS.AVAILABLE) {
          const childAssignment = new AssignmentModel({
            asset: childAsset._id,
            custodian: {
              type: input.custodian.type,
              ref: new mongoose.Types.ObjectId(input.custodian.ref),
            },
            assignedDate: parentAssignment.assignedDate,
            conditionAtAssignment: input.conditionAtAssignment || 'Good',
            notes: `Cascaded from bundle parent ${asset.assetCode}`,
            status: ASSIGNMENT_STATUS.PENDING_ACCEPTANCE,
            parentAssignmentRef: parentAssignment._id,
            createdBy: userId,
            updatedBy: userId,
            version: 1,
          });
          await childAssignment.save({ session });

          childAsset.status = ASSET_STATUS.ASSIGNED;
          childAsset.currentCustodian = asset.currentCustodian;
          childAsset.version += 1;
          await childAsset.save({ session });
        }
      }
    }

    // 4. Audit Log
    if (userId) {
      await AuditLogModel.create(
        [
          {
            actor: userId,
            action: ASSIGNMENT_EVENT.CREATED,
            entityType: 'Assignment',
            entityId: parentAssignment._id,
            afterValue: parentAssignment.toObject(),
            ipAddress,
            requestId: getTransactionRequestId() || 'req-' + Date.now(),
            timestamp: new Date(),
          },
        ],
        { session },
      );
    }

    return parentAssignment;
  }

  /**
   * Accepts an assignment by custodian (FR-ASG-02).
   */
  async acceptAssignment(
    assignmentId: string,
    notes?: string,
    userId?: string,
    ipAddress?: string,
  ): Promise<AssignmentDocument> {
    const session = getTransactionSession();
    const assignment = await AssignmentModel.findById(assignmentId).session(session || null);

    if (!assignment || !assignment.isActive) {
      throw new NotFoundError(`Assignment '${assignmentId}' not found`);
    }

    if (assignment.status !== ASSIGNMENT_STATUS.PENDING_ACCEPTANCE) {
      throw new ValidationError(
        `Assignment '${assignmentId}' is already in status '${assignment.status}'`,
      );
    }

    const before = assignment.toObject();
    assignment.status = ASSIGNMENT_STATUS.ACTIVE;
    assignment.acceptedDate = new Date();
    if (notes) assignment.notes = notes;
    assignment.version += 1;
    assignment.updatedBy = userId as any;
    await assignment.save({ session });

    // Also accept any cascaded child assignments
    await AssignmentModel.updateMany(
      { parentAssignmentRef: assignment._id, status: ASSIGNMENT_STATUS.PENDING_ACCEPTANCE },
      {
        $set: {
          status: ASSIGNMENT_STATUS.ACTIVE,
          acceptedDate: assignment.acceptedDate,
          updatedBy: userId,
        },
        $inc: { version: 1 },
      },
      { session },
    );

    if (userId) {
      await AuditLogModel.create(
        [
          {
            actor: userId,
            action: ASSIGNMENT_EVENT.ACCEPTED,
            entityType: 'Assignment',
            entityId: assignment._id,
            beforeValue: before,
            afterValue: assignment.toObject(),
            ipAddress,
            requestId: getTransactionRequestId() || 'req-' + Date.now(),
            timestamp: new Date(),
          },
        ],
        { session },
      );
    }

    return assignment;
  }

  /**
   * Returns an assigned asset back to stock or maintenance (FR-ASG-04).
   */
  async returnAssignment(
    assignmentId: string,
    input: ReturnAssignmentInput,
    userId?: string,
    ipAddress?: string,
  ): Promise<AssignmentDocument> {
    const session = getTransactionSession();
    const assignment = await AssignmentModel.findById(assignmentId).session(session || null);

    if (!assignment || !assignment.isActive) {
      throw new NotFoundError(`Assignment '${assignmentId}' not found`);
    }

    if (assignment.status === ASSIGNMENT_STATUS.RETURNED) {
      throw new ValidationError(`Assignment '${assignmentId}' has already been returned`);
    }

    const before = assignment.toObject();
    assignment.status = ASSIGNMENT_STATUS.RETURNED;
    assignment.returnedDate = input.returnedDate ? new Date(input.returnedDate) : new Date();
    assignment.conditionAtReturn = input.conditionAtReturn || 'Good';
    if (input.notes) assignment.notes = input.notes;
    assignment.version += 1;
    assignment.updatedBy = userId as any;
    await assignment.save({ session });

    // Update parent Asset status back to available (or maintenance if damaged)
    const asset = await AssetModel.findById(assignment.asset).session(session || null);
    if (asset) {
      asset.status = input.targetStatus === 'maintenance' ? ASSET_STATUS.MAINTENANCE : ASSET_STATUS.AVAILABLE;
      asset.currentCustodian = undefined;
      asset.version += 1;
      await asset.save({ session });

      // Return any child bundle assignments as well
      const childAssignments = await AssignmentModel.find({
        parentAssignmentRef: assignment._id,
        status: { $in: [ASSIGNMENT_STATUS.ACTIVE, ASSIGNMENT_STATUS.PENDING_ACCEPTANCE] },
      }).session(session || null);

      for (const childAsg of childAssignments) {
        childAsg.status = ASSIGNMENT_STATUS.RETURNED;
        childAsg.returnedDate = assignment.returnedDate;
        childAsg.conditionAtReturn = assignment.conditionAtReturn;
        childAsg.version += 1;
        await childAsg.save({ session });

        await AssetModel.updateOne(
          { _id: childAsg.asset },
          {
            $set: { status: ASSET_STATUS.AVAILABLE },
            $unset: { currentCustodian: 1 },
            $inc: { version: 1 },
          },
          { session },
        );
      }
    }

    if (userId) {
      await AuditLogModel.create(
        [
          {
            actor: userId,
            action: ASSIGNMENT_EVENT.RETURNED,
            entityType: 'Assignment',
            entityId: assignment._id,
            beforeValue: before,
            afterValue: assignment.toObject(),
            ipAddress,
            requestId: getTransactionRequestId() || 'req-' + Date.now(),
            timestamp: new Date(),
          },
        ],
        { session },
      );
    }

    return assignment;
  }

  /**
   * Transfers an assignment to a new custodian (FR-ASG-03).
   */
  async transferAssignment(
    assignmentId: string,
    input: TransferAssignmentInput,
    userId?: string,
    ipAddress?: string,
  ): Promise<{ oldAssignment: AssignmentDocument; newAssignment: AssignmentDocument }> {
    const session = getTransactionSession();
    const oldAssignment = await AssignmentModel.findById(assignmentId).session(session || null);

    if (!oldAssignment || !oldAssignment.isActive) {
      throw new NotFoundError(`Assignment '${assignmentId}' not found`);
    }

    if (oldAssignment.status === ASSIGNMENT_STATUS.RETURNED || oldAssignment.status === ASSIGNMENT_STATUS.TRANSFERRED) {
      throw new ValidationError(`Assignment '${assignmentId}' cannot be transferred: current status is '${oldAssignment.status}'`);
    }

    // 1. Mark old assignment as transferred
    const oldBefore = oldAssignment.toObject();
    oldAssignment.status = ASSIGNMENT_STATUS.TRANSFERRED;
    oldAssignment.version += 1;
    oldAssignment.updatedBy = userId as any;
    await oldAssignment.save({ session });

    // 2. Create new assignment for target custodian
    const newAssignment = new AssignmentModel({
      asset: oldAssignment.asset,
      custodian: {
        type: input.targetCustodian.type,
        ref: new mongoose.Types.ObjectId(input.targetCustodian.ref),
      },
      assignedDate: new Date(),
      conditionAtAssignment: input.conditionAtTransfer || oldAssignment.conditionAtAssignment,
      notes: `Transfer from ${oldAssignment.custodian.type}:${oldAssignment.custodian.ref}. Reason: ${input.transferReason}`,
      status: ASSIGNMENT_STATUS.PENDING_ACCEPTANCE,
      createdBy: userId,
      updatedBy: userId,
      version: 1,
    });
    await newAssignment.save({ session });

    // 3. Update asset custodian
    const asset = await AssetModel.findById(oldAssignment.asset).session(session || null);
    if (asset) {
      asset.currentCustodian = {
        type: input.targetCustodian.type,
        ref: new mongoose.Types.ObjectId(input.targetCustodian.ref),
      };
      asset.status = ASSET_STATUS.ASSIGNED;
      asset.version += 1;
      await asset.save({ session });

      // Transfer child bundle assignments if requested
      if (input.includeBundleChildren !== false && asset.bundleChildren.length > 0) {
        for (const childId of asset.bundleChildren) {
          const childOld = await AssignmentModel.findOne({
            asset: childId,
            status: { $in: [ASSIGNMENT_STATUS.ACTIVE, ASSIGNMENT_STATUS.PENDING_ACCEPTANCE] },
          }).session(session || null);

          if (childOld) {
            childOld.status = ASSIGNMENT_STATUS.TRANSFERRED;
            childOld.version += 1;
            await childOld.save({ session });

            const childNew = new AssignmentModel({
              asset: childId,
              custodian: newAssignment.custodian,
              assignedDate: newAssignment.assignedDate,
              conditionAtAssignment: childOld.conditionAtAssignment,
              notes: `Bundle transfer with parent ${asset.assetCode}`,
              status: ASSIGNMENT_STATUS.PENDING_ACCEPTANCE,
              parentAssignmentRef: newAssignment._id,
              createdBy: userId,
              updatedBy: userId,
              version: 1,
            });
            await childNew.save({ session });

            await AssetModel.updateOne(
              { _id: childId },
              { $set: { currentCustodian: newAssignment.custodian }, $inc: { version: 1 } },
              { session },
            );
          }
        }
      }
    }

    if (userId) {
      await AuditLogModel.create(
        [
          {
            actor: userId,
            action: ASSIGNMENT_EVENT.TRANSFERRED,
            entityType: 'Assignment',
            entityId: oldAssignment._id,
            beforeValue: oldBefore,
            afterValue: {
              transferredTo: newAssignment._id,
              targetCustodian: input.targetCustodian,
              reason: input.transferReason,
            },
            ipAddress,
            requestId: getTransactionRequestId() || 'req-' + Date.now(),
            timestamp: new Date(),
          },
        ],
        { session },
      );
    }

    return { oldAssignment, newAssignment };
  }

  /**
   * Retrieves full chronological custody and status timeline for an asset (FR-ASG-06).
   */
  async getAssetHistory(assetId: string) {
    const asset = await AssetModel.findById(assetId)
      .populate('currentCustodian.ref')
      .exec();

    if (!asset) {
      throw new NotFoundError(`Asset with ID '${assetId}' not found`);
    }

    const assignments = await AssignmentModel.find({ asset: asset._id })
      .sort({ createdAt: 1 })
      .exec();

    const auditLogs = await AuditLogModel.find({
      entityType: 'Asset',
      entityId: asset._id,
    })
      .sort({ timestamp: 1 })
      .exec();

    // Compose unified chronological timeline
    const timeline: any[] = [];

    // Add asset creation event
    timeline.push({
      timestamp: asset.createdAt,
      action: 'registered',
      actor: asset.createdBy?.toString(),
      notes: `Asset registered with code ${asset.assetCode}`,
    });

    // Add assignment milestones
    for (const asg of assignments) {
      timeline.push({
        timestamp: asg.assignedDate,
        action: 'assigned',
        custodian: asg.custodian,
        condition: asg.conditionAtAssignment,
        notes: asg.notes,
        assignmentId: asg._id,
      });

      if (asg.acceptedDate) {
        timeline.push({
          timestamp: asg.acceptedDate,
          action: 'accepted',
          custodian: asg.custodian,
          assignmentId: asg._id,
        });
      }

      if (asg.returnedDate) {
        timeline.push({
          timestamp: asg.returnedDate,
          action: 'returned',
          custodian: asg.custodian,
          condition: asg.conditionAtReturn,
          assignmentId: asg._id,
        });
      }
    }

    // Sort all events by timestamp ascending
    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return {
      assetId: asset._id,
      assetCode: asset.assetCode,
      name: asset.name,
      currentCustodian: asset.currentCustodian,
      status: asset.status,
      timeline,
      auditLogsCount: auditLogs.length,
    };
  }
}

export const assignmentService = new AssignmentService();

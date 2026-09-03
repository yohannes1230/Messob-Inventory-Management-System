import mongoose, { Schema, Document, Model } from 'mongoose';
import { REQUEST_CATEGORY, REQUEST_STATUS, RequestCategory, RequestStatus } from '@am-pms/shared-constants';

export interface RequestDocument extends Document {
  _id: mongoose.Types.ObjectId;
  requestNumber: string;
  type: RequestCategory;
  requestType: mongoose.Types.ObjectId;
  requestor: mongoose.Types.ObjectId;
  targetAsset?: mongoose.Types.ObjectId | null;
  targetPropertyType?: mongoose.Types.ObjectId | null;
  payload: Record<string, any>;
  status: RequestStatus;
  workflowInstance?: mongoose.Types.ObjectId | null;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const RequestSchema = new Schema<RequestDocument>(
  {
    requestNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: Object.values(REQUEST_CATEGORY),
      index: true,
    },
    requestType: {
      type: Schema.Types.ObjectId,
      ref: 'RequestType',
      required: true,
      index: true,
    },
    requestor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    targetAsset: {
      type: Schema.Types.ObjectId,
      ref: 'Asset',
      default: null,
      index: true,
    },
    targetPropertyType: {
      type: Schema.Types.ObjectId,
      ref: 'PropertyType',
      default: null,
    },
    payload: {
      type: Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(REQUEST_STATUS),
      default: REQUEST_STATUS.SUBMITTED,
      index: true,
    },
    workflowInstance: {
      type: Schema.Types.ObjectId,
      ref: 'WorkflowInstance',
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  },
);

// Performance compound indexes per SDD §6.3
RequestSchema.index({ status: 1, requestType: 1 });
RequestSchema.index({ requestor: 1, createdAt: -1 });
RequestSchema.index({ type: 1, status: 1 });

export const RequestModel: Model<RequestDocument> =
  mongoose.models.Request || mongoose.model<RequestDocument>('Request', RequestSchema);

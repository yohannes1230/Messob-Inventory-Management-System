import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface AssignmentDocument extends Document {
  _id: Types.ObjectId;
  asset: Types.ObjectId;
  custodian: {
    type: 'employee' | 'department' | 'room';
    ref: Types.ObjectId;
  };
  assignedDate: Date;
  acceptedDate?: Date;
  returnedDate?: Date;
  conditionAtAssignment: string;
  conditionAtReturn?: string;
  notes?: string;
  status: 'pending_acceptance' | 'active' | 'returned' | 'transferred';
  parentAssignmentRef?: Types.ObjectId;
  requestRef?: Types.ObjectId;
  isActive: boolean;
  version: number;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const assignmentSchema = new Schema<AssignmentDocument>(
  {
    asset: { type: Schema.Types.ObjectId, ref: 'Asset', required: true, index: true },
    custodian: {
      type: {
        type: String,
        required: true,
        enum: ['employee', 'department', 'room'],
      },
      ref: { type: Schema.Types.ObjectId, required: true, index: true },
    },
    assignedDate: { type: Date, default: Date.now },
    acceptedDate: { type: Date },
    returnedDate: { type: Date },
    conditionAtAssignment: { type: String, default: 'Good', trim: true },
    conditionAtReturn: { type: String, trim: true },
    notes: { type: String, trim: true },
    status: {
      type: String,
      required: true,
      enum: ['pending_acceptance', 'active', 'returned', 'transferred'],
      default: 'pending_acceptance',
      index: true,
    },
    parentAssignmentRef: { type: Schema.Types.ObjectId, ref: 'Assignment' },
    requestRef: { type: Schema.Types.ObjectId },
    isActive: { type: Boolean, default: true },
    version: { type: Number, default: 1 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

assignmentSchema.index({ asset: 1, createdAt: -1 });
assignmentSchema.index({ 'custodian.ref': 1, status: 1 });

export const AssignmentModel = mongoose.model<AssignmentDocument>('Assignment', assignmentSchema);

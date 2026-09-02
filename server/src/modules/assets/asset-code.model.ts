import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface AssetCodeConfigDocument extends Document {
  _id: Types.ObjectId;
  prefix: string;
  formatTemplate: string;
  scope: 'global' | 'category' | 'property_type';
  scopeRef?: Types.ObjectId;
  currentSequence: number;
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const assetCodeConfigSchema = new Schema<AssetCodeConfigDocument>(
  {
    prefix: { type: String, required: true, uppercase: true, trim: true, default: 'AM' },
    formatTemplate: {
      type: String,
      required: true,
      trim: true,
      default: '{PREFIX}-{BRANCH}-{CAT}-{YYYY}-{SEQ:5}',
    },
    scope: {
      type: String,
      required: true,
      enum: ['global', 'category', 'property_type'],
      default: 'global',
    },
    scopeRef: { type: Schema.Types.ObjectId },
    currentSequence: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
    version: { type: Number, default: 1 },
  },
  { timestamps: true },
);

export const AssetCodeConfigModel = mongoose.model<AssetCodeConfigDocument>(
  'AssetCodeConfig',
  assetCodeConfigSchema,
);

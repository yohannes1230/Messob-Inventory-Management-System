import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface CustomFieldDocument extends Document {
  _id: Types.ObjectId;
  propertyType: Types.ObjectId;
  name: string;
  label: string;
  labelAm: string;
  dataType: 'text' | 'number' | 'date' | 'boolean' | 'single_select' | 'multi_select' | 'attachment';
  isRequired: boolean;
  isUnique: boolean;
  isSearchable: boolean;
  options?: string[];
  validationRule?: string;
  order: number;
  isActive: boolean;
  version: number;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const customFieldSchema = new Schema<CustomFieldDocument>(
  {
    propertyType: {
      type: Schema.Types.ObjectId,
      ref: 'PropertyType',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    label: { type: String, required: true, trim: true },
    labelAm: { type: String, required: true, trim: true },
    dataType: {
      type: String,
      required: true,
      enum: ['text', 'number', 'date', 'boolean', 'single_select', 'multi_select', 'attachment'],
    },
    isRequired: { type: Boolean, default: false },
    isUnique: { type: Boolean, default: false },
    isSearchable: { type: Boolean, default: false },
    options: { type: [String], default: [] },
    validationRule: { type: String },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    version: { type: Number, default: 1, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

customFieldSchema.index({ propertyType: 1, name: 1 }, { unique: true });

export const CustomFieldModel = mongoose.model<CustomFieldDocument>('CustomField', customFieldSchema);

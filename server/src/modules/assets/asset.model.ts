import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface PhotoAttachmentDoc {
  url: string;
  caption?: string;
}

export interface DocumentAttachmentDoc {
  url: string;
  label: string;
  type?: string;
}

export interface CustodianRefDoc {
  type: 'employee' | 'department' | 'room';
  ref: Types.ObjectId;
}

export interface LocationRefDoc {
  branch: Types.ObjectId;
  building?: Types.ObjectId;
  floor?: Types.ObjectId;
  room?: Types.ObjectId;
}

export interface AssetDocument extends Document {
  _id: Types.ObjectId;
  assetCode: string;
  name: string;
  propertyType: Types.ObjectId;
  category: Types.ObjectId;
  status: 'available' | 'pending_acceptance' | 'assigned' | 'in_transfer' | 'maintenance' | 'lost' | 'disposed';
  currentCustodian?: CustodianRefDoc;
  currentLocation: LocationRefDoc;
  value: number;
  currency: string;
  purchaseDate?: Date;
  supplier?: Types.ObjectId;
  warrantyExpiry?: Date;
  customFieldValues: Record<string, any>;
  photos: PhotoAttachmentDoc[];
  documents: DocumentAttachmentDoc[];
  qrCode: string;
  barcodeFormat: string;
  isBundleParent: boolean;
  bundleParent?: Types.ObjectId;
  bundleChildren: Types.ObjectId[];
  isActive: boolean;
  version: number;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const photoAttachmentSchema = new Schema<PhotoAttachmentDoc>(
  {
    url: { type: String, required: true },
    caption: { type: String, trim: true },
  },
  { _id: false },
);

const documentAttachmentSchema = new Schema<DocumentAttachmentDoc>(
  {
    url: { type: String, required: true },
    label: { type: String, required: true, trim: true },
    type: { type: String, trim: true },
  },
  { _id: false },
);

const custodianRefSchema = new Schema<CustodianRefDoc>(
  {
    type: {
      type: String,
      required: true,
      enum: ['employee', 'department', 'room'],
    },
    ref: { type: Schema.Types.ObjectId, required: true, index: true },
  },
  { _id: false },
);

const locationRefSchema = new Schema<LocationRefDoc>(
  {
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    building: { type: Schema.Types.ObjectId, ref: 'Building' },
    floor: { type: Schema.Types.ObjectId, ref: 'Floor' },
    room: { type: Schema.Types.ObjectId, ref: 'Room' },
  },
  { _id: false },
);

const assetSchema = new Schema<AssetDocument>(
  {
    assetCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    propertyType: {
      type: Schema.Types.ObjectId,
      ref: 'PropertyType',
      required: true,
      index: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: [
        'available',
        'pending_acceptance',
        'assigned',
        'in_transfer',
        'maintenance',
        'lost',
        'disposed',
      ],
      default: 'available',
      index: true,
    },
    currentCustodian: { type: custodianRefSchema },
    currentLocation: { type: locationRefSchema, required: true },
    value: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'ETB', trim: true },
    purchaseDate: { type: Date },
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier' },
    warrantyExpiry: { type: Date },
    customFieldValues: { type: Schema.Types.Mixed, default: {} },
    photos: { type: [photoAttachmentSchema], default: [] },
    documents: { type: [documentAttachmentSchema], default: [] },
    qrCode: { type: String, default: '' },
    barcodeFormat: { type: String, default: 'CODE128' },
    isBundleParent: { type: Boolean, default: false, index: true },
    bundleParent: { type: Schema.Types.ObjectId, ref: 'Asset', index: true },
    bundleChildren: [{ type: Schema.Types.ObjectId, ref: 'Asset' }],
    isActive: { type: Boolean, default: true, index: true },
    version: { type: Number, default: 1, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

// Compound and text indexes per Design Doc §6.3
assetSchema.index({ status: 1, propertyType: 1 });
assetSchema.index({ name: 'text', assetCode: 'text' });

export const AssetModel = mongoose.model<AssetDocument>('Asset', assetSchema);

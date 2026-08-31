import mongoose, { Schema, type Document, type Types } from 'mongoose';

// ── Branch Schema ──
export interface BranchDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  nameAm: string;
  code: string;
  address?: string;
  contact?: string;
  isActive: boolean;
  version: number;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const branchSchema = new Schema<BranchDocument>(
  {
    name: { type: String, required: true, trim: true },
    nameAm: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    address: { type: String, trim: true },
    contact: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
    version: { type: Number, default: 1, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const BranchModel = mongoose.model<BranchDocument>('Branch', branchSchema);

// ── Building Schema ──
export interface BuildingDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  nameAm?: string;
  branch: Types.ObjectId;
  floorsCount: number;
  isActive: boolean;
  version: number;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const buildingSchema = new Schema<BuildingDocument>(
  {
    name: { type: String, required: true, trim: true },
    nameAm: { type: String, trim: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    floorsCount: { type: Number, required: true, min: 1 },
    isActive: { type: Boolean, default: true, index: true },
    version: { type: Number, default: 1, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const BuildingModel = mongoose.model<BuildingDocument>('Building', buildingSchema);

// ── Floor Schema ──
export interface FloorDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  nameAm?: string;
  building: Types.ObjectId;
  order: number;
  isActive: boolean;
  version: number;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const floorSchema = new Schema<FloorDocument>(
  {
    name: { type: String, required: true, trim: true },
    nameAm: { type: String, trim: true },
    building: { type: Schema.Types.ObjectId, ref: 'Building', required: true, index: true },
    order: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true, index: true },
    version: { type: Number, default: 1, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const FloorModel = mongoose.model<FloorDocument>('Floor', floorSchema);

// ── Room Schema ──
export interface RoomDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  nameAm?: string;
  floor: Types.ObjectId;
  building: Types.ObjectId;
  branch: Types.ObjectId;
  capacity?: number;
  purpose?: string;
  isActive: boolean;
  version: number;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const roomSchema = new Schema<RoomDocument>(
  {
    name: { type: String, required: true, trim: true },
    nameAm: { type: String, trim: true },
    floor: { type: Schema.Types.ObjectId, ref: 'Floor', required: true, index: true },
    building: { type: Schema.Types.ObjectId, ref: 'Building', required: true, index: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    capacity: { type: Number, min: 0 },
    purpose: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
    version: { type: Number, default: 1, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const RoomModel = mongoose.model<RoomDocument>('Room', roomSchema);

// ── Department Schema (Hierarchical Parent-Child Support) ──
export interface DepartmentDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  nameAm: string;
  code: string;
  parentDepartment?: Types.ObjectId | null;
  branch: Types.ObjectId;
  isActive: boolean;
  version: number;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const departmentSchema = new Schema<DepartmentDocument>(
  {
    name: { type: String, required: true, trim: true },
    nameAm: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    parentDepartment: { type: Schema.Types.ObjectId, ref: 'Department', default: null, index: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
    version: { type: Number, default: 1, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const DepartmentModel = mongoose.model<DepartmentDocument>('Department', departmentSchema);

// ── Category Schema (Hierarchical Parent-Child Support) ──
export interface CategoryDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  nameAm: string;
  parentCategory?: Types.ObjectId | null;
  description?: string;
  isActive: boolean;
  version: number;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<CategoryDocument>(
  {
    name: { type: String, required: true, trim: true },
    nameAm: { type: String, required: true, trim: true },
    parentCategory: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
    version: { type: Number, default: 1, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const CategoryModel = mongoose.model<CategoryDocument>('Category', categorySchema);

// ── PropertyType Schema ──
export interface PropertyTypeDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  nameAm: string;
  category: Types.ObjectId;
  unitOfMeasure: string;
  defaultUsefulLifeMonths: number;
  customFieldDefs: Types.ObjectId[];
  statusFlowOverride?: Types.ObjectId | null;
  isActive: boolean;
  version: number;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const propertyTypeSchema = new Schema<PropertyTypeDocument>(
  {
    name: { type: String, required: true, trim: true },
    nameAm: { type: String, required: true, trim: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    unitOfMeasure: { type: String, required: true, trim: true },
    defaultUsefulLifeMonths: { type: Number, required: true, min: 1 },
    customFieldDefs: [{ type: Schema.Types.ObjectId, ref: 'CustomField', default: [] }],
    statusFlowOverride: { type: Schema.Types.ObjectId, ref: 'StatusFlow', default: null },
    isActive: { type: Boolean, default: true, index: true },
    version: { type: Number, default: 1, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const PropertyTypeModel = mongoose.model<PropertyTypeDocument>('PropertyType', propertyTypeSchema);

// ── StatusFlow Schema (FR-MD-03) ──
export interface StatusFlowDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  states: {
    key: string;
    label: string;
    labelAm?: string;
    colorToken: string;
  }[];
  transitions: {
    from: string;
    to: string;
    allowedRoles: string[];
  }[];
  isActive: boolean;
  version: number;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const statusFlowSchema = new Schema<StatusFlowDocument>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    states: [
      {
        _id: false,
        key: { type: String, required: true },
        label: { type: String, required: true },
        labelAm: { type: String },
        colorToken: { type: String, required: true },
      },
    ],
    transitions: [
      {
        _id: false,
        from: { type: String, required: true },
        to: { type: String, required: true },
        allowedRoles: [{ type: String, required: true }],
      },
    ],
    isActive: { type: Boolean, default: true, index: true },
    version: { type: Number, default: 1, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const StatusFlowModel = mongoose.model<StatusFlowDocument>('StatusFlow', statusFlowSchema);

// ── RequestType Schema (FR-MD-04) ──
export interface RequestTypeDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  module: 'assignment' | 'transfer' | 'maintenance' | 'disposal' | 'new_asset';
  workflowDefinition?: Types.ObjectId | null;
  isActive: boolean;
  version: number;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const requestTypeSchema = new Schema<RequestTypeDocument>(
  {
    name: { type: String, required: true, trim: true },
    module: {
      type: String,
      required: true,
      enum: ['assignment', 'transfer', 'maintenance', 'disposal', 'new_asset'],
      index: true,
    },
    workflowDefinition: {
      type: Schema.Types.ObjectId,
      ref: 'WorkflowDefinition',
      default: null,
    },
    isActive: { type: Boolean, default: true, index: true },
    version: { type: Number, default: 1, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const RequestTypeModel = mongoose.model<RequestTypeDocument>('RequestType', requestTypeSchema);

// ── Unified MasterDataHistory Schema (FR-MD-06) ──
export interface MasterDataHistoryDocument extends Document {
  _id: Types.ObjectId;
  entityType: string;
  entityId: Types.ObjectId;
  version: number;
  action: 'create' | 'update' | 'deactivate';
  diff: Record<string, { before: any; after: any }>;
  snapshot: Record<string, any>;
  performedBy: Types.ObjectId;
  timestamp: Date;
  comment?: string;
}

const masterDataHistorySchema = new Schema<MasterDataHistoryDocument>(
  {
    entityType: { type: String, required: true, index: true },
    entityId: { type: Schema.Types.ObjectId, required: true, index: true },
    version: { type: Number, required: true },
    action: {
      type: String,
      required: true,
      enum: ['create', 'update', 'deactivate'],
    },
    diff: { type: Schema.Types.Mixed, default: {} },
    snapshot: { type: Schema.Types.Mixed, required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    timestamp: { type: Date, default: Date.now, index: true },
    comment: { type: String },
  },
  { timestamps: false },
);

masterDataHistorySchema.index({ entityType: 1, entityId: 1, version: -1 });

export const MasterDataHistoryModel = mongoose.model<MasterDataHistoryDocument>(
  'MasterDataHistory',
  masterDataHistorySchema,
);

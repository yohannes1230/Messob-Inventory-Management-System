export interface IBranch {
  _id: string;
  name: string;
  nameAm: string;
  code: string;
  address?: string;
  contact?: string;
  isActive: boolean;
  version: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface IBuilding {
  _id: string;
  name: string;
  nameAm?: string;
  branch: string;
  floorsCount: number;
  isActive: boolean;
  version: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface IFloor {
  _id: string;
  name: string;
  nameAm?: string;
  building: string;
  order: number;
  isActive: boolean;
  version: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface IRoom {
  _id: string;
  name: string;
  nameAm?: string;
  floor: string;
  building: string;
  branch: string;
  capacity?: number;
  purpose?: string;
  isActive: boolean;
  version: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface IDepartment {
  _id: string;
  name: string;
  nameAm: string;
  code: string;
  parentDepartment?: string | null;
  branch: string;
  isActive: boolean;
  version: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface ICategory {
  _id: string;
  name: string;
  nameAm: string;
  parentCategory?: string | null;
  description?: string;
  isActive: boolean;
  version: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface IPropertyType {
  _id: string;
  name: string;
  nameAm: string;
  category: string;
  unitOfMeasure: string;
  defaultUsefulLifeMonths: number;
  customFieldDefs?: string[];
  statusFlowOverride?: string | null;
  isActive: boolean;
  version: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface IStatusState {
  key: string;
  label: string;
  labelAm?: string;
  colorToken: string;
}

export interface IStatusTransition {
  from: string;
  to: string;
  allowedRoles: string[];
}

export interface IStatusFlow {
  _id: string;
  name: string;
  states: IStatusState[];
  transitions: IStatusTransition[];
  isActive: boolean;
  version: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  createdBy?: string;
  updatedBy?: string;
}

export type RequestTypeModule =
  | 'assignment'
  | 'transfer'
  | 'maintenance'
  | 'disposal'
  | 'new_asset';

export interface IRequestType {
  _id: string;
  name: string;
  module: RequestTypeModule;
  workflowDefinition?: string | null;
  isActive: boolean;
  version: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface IMasterDataHistory {
  _id: string;
  entityType: string;
  entityId: string;
  version: number;
  action: 'create' | 'update' | 'deactivate';
  diff: Record<string, { before: any; after: any }>;
  snapshot: Record<string, any>;
  performedBy: string;
  timestamp: string | Date;
  comment?: string;
}

import { REQUEST_CATEGORY, REQUEST_STATUS } from '@am-pms/shared-constants';
import { IRequestType, IPropertyType } from './masterdata.types.js';
import { AssetDto } from './asset.types.js';
import { IUser } from './auth.types.js';

export type RequestCategoryType = (typeof REQUEST_CATEGORY)[keyof typeof REQUEST_CATEGORY];
export type RequestStatusType = (typeof REQUEST_STATUS)[keyof typeof REQUEST_STATUS];

/**
 * Payload for Asset Allocation / Hardware request (FR-ESS-06)
 */
export interface IAssetAllocationPayload {
  justification: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  requestedSpecifications?: string;
  departmentId?: string;
  estimatedNeededDate?: string | Date;
}

/**
 * Payload for Asset Return initiation (FR-ESS-04)
 */
export interface IAssetReturnPayload {
  reason: string;
  conditionNotes?: string;
  proposedReturnDate?: string | Date;
}

/**
 * Payload for Damage / Loss / Malfunction issue report (FR-ESS-05)
 */
export interface IDamageLossPayload {
  issueType: 'damage' | 'loss' | 'malfunction';
  severity: 'minor' | 'moderate' | 'severe' | 'critical';
  description: string;
  incidentDate?: string | Date;
  photos?: string[];
}

/**
 * Payload for Transfer request
 */
export interface ITransferPayload {
  targetCustodianType: 'employee' | 'department' | 'room';
  targetCustodianRef: string;
  targetLocation?: {
    branch?: string;
    building?: string;
    floor?: string;
    room?: string;
  };
  reason?: string;
}

/**
 * Canonical Request interface (Design Doc §6.2 and SRS 9.13).
 */
export interface IRequest {
  _id: string;
  requestNumber: string;
  type: RequestCategoryType;
  requestType: string | IRequestType;
  requestor: string | IUser;
  targetAsset?: string | AssetDto | null;
  targetPropertyType?: string | IPropertyType | null;
  payload: Record<string, any>;
  status: RequestStatusType;
  workflowInstance?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  createdBy?: string;
  updatedBy?: string;
}

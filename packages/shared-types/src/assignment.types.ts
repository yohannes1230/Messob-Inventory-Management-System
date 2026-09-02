import { CustodianRef } from './asset.types.js';

export interface AssignmentDto {
  _id: string;
  asset: string;
  custodian: CustodianRef;
  assignedDate: string;
  acceptedDate?: string;
  returnedDate?: string;
  conditionAtAssignment: string;
  conditionAtReturn?: string;
  notes?: string;
  status: 'pending_acceptance' | 'active' | 'returned' | 'transferred';
  requestRef?: string;
  parentAssignmentRef?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustodyTimelineEvent {
  timestamp: string;
  action: 'registered' | 'assigned' | 'accepted' | 'transferred' | 'returned' | 'maintenance' | 'bundle_split' | 'bundle_joined';
  actor?: string;
  custodian?: CustodianRef;
  condition?: string;
  notes?: string;
  assignmentId?: string;
}

export interface AssetHistoryResponse {
  assetId: string;
  assetCode: string;
  name: string;
  currentCustodian?: CustodianRef;
  status: string;
  timeline: CustodyTimelineEvent[];
}

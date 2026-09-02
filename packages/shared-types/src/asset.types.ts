export interface PhotoAttachment {
  url: string;
  caption?: string;
}

export interface DocumentAttachment {
  url: string;
  label: string;
  type?: string;
}

export interface CustodianRef {
  type: 'employee' | 'department' | 'room';
  ref: string;
}

export interface LocationRef {
  branch: string;
  building?: string;
  floor?: string;
  room?: string;
}

export interface AssetDto {
  _id: string;
  assetCode: string;
  name: string;
  propertyType: string;
  category: string;
  status: 'available' | 'pending_acceptance' | 'assigned' | 'in_transfer' | 'maintenance' | 'lost' | 'disposed';
  currentCustodian?: CustodianRef;
  currentLocation: LocationRef;
  value: number;
  currency: string;
  purchaseDate?: string;
  supplier?: string;
  warrantyExpiry?: string;
  customFieldValues: Record<string, any>;
  photos: PhotoAttachment[];
  documents: DocumentAttachment[];
  qrCode: string;
  barcodeFormat: string;
  bundleParent?: string;
  bundleChildren: string[];
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface BulkImportRowReport {
  rowIndex: number;
  data: Record<string, any>;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface BulkImportValidationReport {
  totalRows: number;
  validRowsCount: number;
  invalidRowsCount: number;
  rowReports: BulkImportRowReport[];
}

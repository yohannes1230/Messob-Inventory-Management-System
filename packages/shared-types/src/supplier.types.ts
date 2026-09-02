export interface SupplierContact {
  person?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface SupplierDto {
  _id: string;
  name: string;
  contact: SupplierContact;
  taxId?: string;
  category?: string;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

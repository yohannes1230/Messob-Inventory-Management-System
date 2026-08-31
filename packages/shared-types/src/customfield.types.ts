export type CustomFieldDataType =
  | 'text'
  | 'number'
  | 'date'
  | 'boolean'
  | 'single_select'
  | 'multi_select'
  | 'attachment';

export interface ICustomField {
  _id: string;
  propertyType: string;
  name: string;
  label: string;
  labelAm: string;
  dataType: CustomFieldDataType;
  isRequired: boolean;
  isUnique: boolean;
  isSearchable: boolean;
  options?: string[];
  validationRule?: string;
  order: number;
  isActive: boolean;
  version: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface ICustomFieldValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

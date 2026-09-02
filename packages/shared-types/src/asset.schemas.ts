import { z } from 'zod';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

export const CustodianRefSchema = z.object({
  type: z.enum(['employee', 'department', 'room']),
  ref: objectIdSchema,
});

export const LocationRefSchema = z.object({
  branch: objectIdSchema,
  building: objectIdSchema.optional(),
  floor: objectIdSchema.optional(),
  room: objectIdSchema.optional(),
});

export const PhotoAttachmentSchema = z.object({
  url: z.string().min(1).url().or(z.string().startsWith('/')),
  caption: z.string().max(200).optional(),
});

export const DocumentAttachmentSchema = z.object({
  url: z.string().min(1),
  label: z.string().max(100),
  type: z.string().max(50).optional(),
});

export const CreateAssetSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  propertyType: objectIdSchema,
  category: objectIdSchema.optional(),
  status: z.enum([
    'available',
    'pending_acceptance',
    'assigned',
    'in_transfer',
    'maintenance',
    'lost',
    'disposed',
  ]).default('available'),
  currentCustodian: CustodianRefSchema.optional(),
  currentLocation: LocationRefSchema,
  value: z.number().min(0).default(0),
  currency: z.string().max(10).default('ETB'),
  purchaseDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  supplier: objectIdSchema.optional(),
  warrantyExpiry: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  customFieldValues: z.record(z.any()).default({}),
  photos: z.array(PhotoAttachmentSchema).default([]),
  documents: z.array(DocumentAttachmentSchema).default([]),
  bundleParent: objectIdSchema.optional(),
  bundleChildren: z.array(objectIdSchema).default([]),
});

export const UpdateAssetSchema = CreateAssetSchema.partial();

export const BulkImportRowSchema = z.object({
  name: z.string().min(1).trim(),
  propertyTypeName: z.string().min(1).trim(),
  branchCode: z.string().min(1).trim(),
  value: z.coerce.number().min(0).optional().default(0),
  currency: z.string().max(10).optional().default('ETB'),
  purchaseDate: z.string().optional(),
  supplierName: z.string().optional(),
  warrantyExpiry: z.string().optional(),
  customFields: z.record(z.any()).optional().default({}),
});

export const BulkImportDryRunSchema = z.object({
  rows: z.array(z.record(z.any())),
});

export const BulkImportCommitSchema = z.object({
  rows: z.array(z.record(z.any())),
});

export const AttachPhotoSchema = z.object({
  photos: z.array(PhotoAttachmentSchema).min(1),
});

export const AttachBundleSchema = z.object({
  childAssetId: objectIdSchema,
});

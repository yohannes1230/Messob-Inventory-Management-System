import { z } from 'zod';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

// ── Branch ──
export const CreateBranchSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  nameAm: z.string().min(2).max(100).trim(),
  code: z.string().min(2).max(20).trim().toUpperCase(),
  address: z.string().max(255).optional(),
  contact: z.string().max(100).optional(),
});
export const UpdateBranchSchema = CreateBranchSchema.partial();

// ── Building ──
export const CreateBuildingSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  nameAm: z.string().max(100).trim().optional(),
  branch: objectIdSchema,
  floorsCount: z.number().int().min(1).max(200),
});
export const UpdateBuildingSchema = CreateBuildingSchema.partial();

// ── Floor ──
export const CreateFloorSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  nameAm: z.string().max(100).trim().optional(),
  building: objectIdSchema,
  order: z.number().int().min(0).max(200),
});
export const UpdateFloorSchema = CreateFloorSchema.partial();

// ── Room ──
export const CreateRoomSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  nameAm: z.string().max(100).trim().optional(),
  floor: objectIdSchema,
  building: objectIdSchema,
  branch: objectIdSchema,
  capacity: z.number().int().min(0).optional(),
  purpose: z.string().max(255).optional(),
});
export const UpdateRoomSchema = CreateRoomSchema.partial();

// ── Department ──
export const CreateDepartmentSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  nameAm: z.string().min(2).max(100).trim(),
  code: z.string().min(2).max(20).trim().toUpperCase(),
  parentDepartment: objectIdSchema.nullable().optional(),
  branch: objectIdSchema,
});
export const UpdateDepartmentSchema = CreateDepartmentSchema.partial();

// ── Category ──
export const CreateCategorySchema = z.object({
  name: z.string().min(2).max(100).trim(),
  nameAm: z.string().min(2).max(100).trim(),
  parentCategory: objectIdSchema.nullable().optional(),
  description: z.string().max(500).optional(),
});
export const UpdateCategorySchema = CreateCategorySchema.partial();

// ── PropertyType ──
export const CreatePropertyTypeSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  nameAm: z.string().min(2).max(100).trim(),
  category: objectIdSchema,
  unitOfMeasure: z.string().min(1).max(50).trim(),
  defaultUsefulLifeMonths: z.number().int().min(1).max(1200),
  customFieldDefs: z.array(objectIdSchema).optional(),
  statusFlowOverride: objectIdSchema.nullable().optional(),
});
export const UpdatePropertyTypeSchema = CreatePropertyTypeSchema.partial();

// ── StatusFlow ──
export const StatusStateSchema = z.object({
  key: z.string().min(1).max(50).trim(),
  label: z.string().min(1).max(100).trim(),
  labelAm: z.string().max(100).trim().optional(),
  colorToken: z.string().min(1).max(50).trim(),
});

export const StatusTransitionSchema = z.object({
  from: z.string().min(1).max(50).trim(),
  to: z.string().min(1).max(50).trim(),
  allowedRoles: z.array(z.string().min(1).max(50)).min(1),
});

export const CreateStatusFlowSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  states: z.array(StatusStateSchema).min(1),
  transitions: z.array(StatusTransitionSchema).min(1),
});
export const UpdateStatusFlowSchema = CreateStatusFlowSchema.partial();

// ── RequestType ──
export const CreateRequestTypeSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  module: z.enum(['assignment', 'transfer', 'maintenance', 'disposal', 'new_asset']),
  workflowDefinition: objectIdSchema.nullable().optional(),
});
export const UpdateRequestTypeSchema = CreateRequestTypeSchema.partial();

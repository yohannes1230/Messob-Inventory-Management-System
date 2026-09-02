import { z } from 'zod';
import { CustodianRefSchema } from './asset.schemas.js';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

export const CreateAssignmentSchema = z.object({
  asset: objectIdSchema,
  custodian: CustodianRefSchema,
  assignedDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  conditionAtAssignment: z.string().max(200).default('Good'),
  notes: z.string().max(500).optional(),
  includeBundleChildren: z.boolean().default(true),
});

export const AcceptAssignmentSchema = z.object({
  notes: z.string().max(500).optional(),
});

export const ReturnAssignmentSchema = z.object({
  returnedDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  conditionAtReturn: z.string().max(200).default('Good'),
  notes: z.string().max(500).optional(),
  targetStatus: z.enum(['available', 'maintenance']).default('available'),
});

export const TransferAssignmentSchema = z.object({
  targetCustodian: CustodianRefSchema,
  transferReason: z.string().min(1).max(500).trim(),
  conditionAtTransfer: z.string().max(200).default('Good'),
  notes: z.string().max(500).optional(),
  includeBundleChildren: z.boolean().default(true),
});

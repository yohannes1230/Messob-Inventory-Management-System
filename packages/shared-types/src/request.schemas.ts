import { z } from 'zod';
import { REQUEST_CATEGORY } from '@am-pms/shared-constants';

export const RequestCategorySchema = z.nativeEnum(REQUEST_CATEGORY);

/**
 * Zod schema for request creation — New Property Allocation (FR-ESS-01)
 * POST /requests
 */
export const CreateRequestSchema = z.object({
  type: RequestCategorySchema.optional(),
  requestTypeId: z.string().min(1, 'requestTypeId is required'),
  targetAsset: z.string().optional().nullable(),
  targetPropertyType: z.string().optional().nullable(),
  payload: z.record(z.any()).default({}),
});

export type CreateRequestDTO = z.infer<typeof CreateRequestSchema>;

/**
 * Zod schema for reporting an issue/damage on an asset (FR-ESS-05)
 * POST /assets/:id/report-issue
 */
export const ReportIssueSchema = z.object({
  issueType: z.enum(['damage', 'loss', 'malfunction'], {
    required_error: 'Issue type is required',
  }),
  severity: z.enum(['minor', 'moderate', 'severe', 'critical']).default('moderate'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  incidentDate: z.string().optional(),
  photos: z.array(z.string()).optional().default([]),
});

export type ReportIssueDTO = z.infer<typeof ReportIssueSchema>;

/**
 * Zod schema for initiating an asset return request (FR-ESS-04)
 * POST /assets/:id/request-return
 */
export const RequestReturnSchema = z.object({
  reason: z.string().min(3, 'Reason must be at least 3 characters'),
  conditionNotes: z.string().optional(),
  proposedReturnDate: z.string().optional(),
});

export type RequestReturnDTO = z.infer<typeof RequestReturnSchema>;

/**
 * Zod schema for cancelling a submitted request
 * POST /requests/:id/cancel
 */
export const CancelRequestSchema = z.object({
  reason: z.string().optional(),
});

export type CancelRequestDTO = z.infer<typeof CancelRequestSchema>;

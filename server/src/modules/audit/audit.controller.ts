/**
 * Audit log controller.
 */

import type { Request } from 'express';
import type { ControllerResult, PaginatedResult, AuditLogQueryInput } from '@am-pms/shared-types';
import { auditService } from './audit.service.js';

export class AuditController {
  async list(req: Request): Promise<ControllerResult<PaginatedResult<unknown>>> {
    const query = (req as any).validatedQuery as AuditLogQueryInput;

    const result = await auditService.queryLogs({
      entityType: query.entityType,
      entityId: query.entityId,
      actor: query.actor,
      action: query.action,
      startDate: query.startDate,
      endDate: query.endDate,
      page: query.page,
      limit: query.limit,
    });

    return { status: 200, data: result };
  }
}

export const auditController = new AuditController();

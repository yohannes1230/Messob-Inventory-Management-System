/**
 * Audit service — read-only query operations.
 *
 * Audit entries are NOT created through this service. They are created by:
 *   1. The mutationHandler middleware (for standard CRUD routes)
 *   2. The auth service's self-managed transactions (for login/refresh)
 */

import { auditRepository } from './audit.repository.js';
import type { AuditLogDocument } from './audit.model.js';
import type { PaginatedResult } from '@am-pms/shared-types';

export class AuditService {
  async queryLogs(options: {
    entityType?: string;
    entityId?: string;
    actor?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResult<AuditLogDocument>> {
    return auditRepository.query(options);
  }
}

export const auditService = new AuditService();

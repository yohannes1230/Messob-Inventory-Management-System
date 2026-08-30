/**
 * Audit repository — extends BaseRepository for AuditLog.
 *
 * Note: The `create()` method is inherited from BaseRepository and
 * automatically uses the ambient session from AsyncLocalStorage.
 * This is used by the auth service for self-managed transactions.
 */

import { BaseRepository, type FindManyOptions } from '../../common/data/base-repository.js';
import { AuditLogModel, type AuditLogDocument } from './audit.model.js';
import type { IAuditLog, PaginatedResult } from '@am-pms/shared-types';
import type { FilterQuery } from 'mongoose';

class AuditRepository extends BaseRepository<AuditLogDocument> {
  constructor() {
    super(AuditLogModel);
  }

  /**
   * Query audit logs with filters and pagination.
   * Read-only — no session required.
   */
  async query(options: {
    entityType?: string;
    entityId?: string;
    actor?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResult<AuditLogDocument>> {
    const filter: FilterQuery<AuditLogDocument> = {};

    if (options.entityType) filter.entityType = options.entityType;
    if (options.entityId) filter.entityId = options.entityId;
    if (options.actor) filter.actor = options.actor;
    if (options.action) filter.action = options.action;

    if (options.startDate || options.endDate) {
      filter.timestamp = {};
      if (options.startDate) filter.timestamp.$gte = new Date(options.startDate);
      if (options.endDate) filter.timestamp.$lte = new Date(options.endDate);
    }

    return this.findMany({
      filter,
      page: options.page,
      limit: options.limit,
      sort: { timestamp: -1 },
      populate: [{ path: 'actor', select: 'username email' }],
    });
  }
}

export const auditRepository = new AuditRepository();

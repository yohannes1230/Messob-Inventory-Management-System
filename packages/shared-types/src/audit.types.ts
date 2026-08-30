/**
 * Audit-related TypeScript interfaces shared between API and web.
 */

export interface IAuditLog {
  _id: string;
  actor?: string; // ObjectId as string — undefined for unauthenticated events
  action: string;
  entityType: string;
  entityId?: string;
  beforeValue?: unknown;
  afterValue?: unknown;
  timestamp: Date;
  ipAddress?: string;
  requestId: string;
}

/**
 * Data required to create an audit entry.
 * Used by the audit interceptor and auth service.
 */
export interface IAuditEntry {
  actor?: string;
  action: string;
  entityType: string;
  entityId?: string;
  beforeValue?: unknown;
  afterValue?: unknown;
  ipAddress?: string;
  requestId: string;
}

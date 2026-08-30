/**
 * Common types used across all modules.
 */

/** Paginated response wrapper for list endpoints. */
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

/** Standard API response envelope. */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Result returned by controller methods to the handler wrappers.
 * Controllers return data + metadata; the wrapper handles res.json().
 */
export interface ControllerResult<T = unknown> {
  status: number;
  data: T;
  audit?: AuditMeta;
}

/**
 * Metadata the controller provides for audit logging.
 * The handler wrapper writes the actual AuditLog entry.
 */
export interface AuditMeta {
  action: string;
  entityType: string;
  entityId?: string;
  beforeValue?: unknown;
}

/**
 * Middleware that attaches a UUID requestId to every incoming request.
 * Used for audit trail correlation and structured logging.
 */

import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Unique per-request correlation ID for audit/logging. */
      id: string;
    }
  }
}

export function requestIdMiddleware(req: Request, _res: Response, next: NextFunction): void {
  req.id = (req.headers['x-request-id'] as string) || randomUUID();
  next();
}

/**
 * Route handler wrappers: mutationHandler and queryHandler.
 *
 * These replace the traditional Express `(req, res, next) => {}` pattern
 * with a structured approach where controllers return ControllerResult
 * objects. The wrappers handle:
 *
 *   mutationHandler: session → transaction → handler → audit → commit → respond
 *   queryHandler: handler → respond (no transaction overhead)
 *
 * STRUCTURAL GUARANTEE: mutationHandler creates a Mongoose session, stores
 * it in AsyncLocalStorage, and commits/aborts the transaction. The audit
 * entry is written inside the same transaction. The safety-net assertion
 * (AuditLog.countDocuments) ensures the transaction cannot commit without
 * an audit entry for mutating operations.
 */

import type { Request, Response, NextFunction } from 'express';
import { mongoose } from '../config/database.js';
import { runInTransactionContext } from '../utils/async-context.js';
import { logger, AppError } from '../utils/index.js';
import type { ControllerResult, AuditMeta } from '@am-pms/shared-types';

// Lazy import to avoid circular dependency — the audit model is loaded at runtime
let AuditLogModel: typeof import('../../modules/audit/audit.model.js').AuditLogModel;

async function getAuditLogModel() {
  if (!AuditLogModel) {
    const mod = await import('../../modules/audit/audit.model.js');
    AuditLogModel = mod.AuditLogModel;
  }
  return AuditLogModel;
}

/**
 * Wraps a mutating route handler (POST/PATCH/PUT/DELETE) in a Mongoose
 * transaction with automatic audit logging.
 *
 * The controller function returns a ControllerResult with optional audit
 * metadata. The wrapper:
 * 1. Creates a Mongoose session and starts a transaction
 * 2. Stores the session in AsyncLocalStorage
 * 3. Executes the controller (all repository writes use the ambient session)
 * 4. Writes an AuditLog entry if audit metadata is provided
 * 5. Checks the safety-net: aborts if no audit entry was written for a
 *    successful mutating operation
 * 6. Commits the transaction and sends the response
 * 7. On any error: aborts the transaction
 */
export function mutationHandler<T>(
  fn: (req: Request, res: Response) => Promise<ControllerResult<T>>,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const session = await mongoose.startSession();

    try {
      let result: ControllerResult<T> | undefined;

      await session.withTransaction(async () => {
        result = await runInTransactionContext(
          { session, requestId: String(req.id) },
          async () => {
            // Execute the controller
            const controllerResult = await fn(req, res);

            // Write audit entry if metadata provided
            if (controllerResult.audit) {
              const Model = await getAuditLogModel();
              await Model.create(
                [
                  {
                    actor: (req as any).user?.sub || (req as any).user?._id,
                    action: controllerResult.audit.action,
                    entityType: controllerResult.audit.entityType,
                    entityId: controllerResult.audit.entityId,
                    beforeValue: controllerResult.audit.beforeValue,
                    afterValue: controllerResult.data,
                    timestamp: new Date(),
                    ipAddress: req.ip,
                    requestId: String(req.id),
                  },
                ],
                { session },
              );
            }

            // ── Safety-net assertion (Correction #1) ──
            // Uses AuditLog.countDocuments as the PRIMARY mechanism.
            // session.transaction.collectionsAffected is NOT a documented API.
            if (controllerResult.status < 400) {
              const Model = await getAuditLogModel();
              const auditCount = await Model.countDocuments(
                { requestId: String(req.id) },
                { session },
              );
              if (auditCount === 0) {
                throw new Error(
                  'AUDIT_MISSING: mutating route completed successfully without ' +
                  'producing an audit entry. This violates the atomicity guarantee. ' +
                  `Route: ${req.method} ${req.path}`,
                );
              }
            }

            return controllerResult;
          },
        );
      });

      // Mark request as handled by transaction middleware (for safety-net listener)
      (req as any).__transactionCommitted = true;

      // Transaction committed — send response
      res.status(result!.status).json({
        success: true,
        data: result!.data,
      });
    } catch (err) {
      // Transaction was aborted by withTransaction() on error
      next(err);
    } finally {
      await session.endSession();
    }
  };
}

/**
 * Wraps a read-only route handler (GET) — no transaction, no audit.
 * Also used for auth routes that manage their own transactions internally.
 */
export function queryHandler<T>(
  fn: (req: Request, res: Response) => Promise<ControllerResult<T>>,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await fn(req, res);

      // Mark request as handled
      (req as any).__handlerUsed = true;

      res.status(result.status).json({
        success: true,
        data: result.data,
      });
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Global safety-net middleware — mounted AFTER all routes.
 *
 * Detects if a mutating request completed without going through
 * mutationHandler or queryHandler. This catches edge cases where
 * someone writes a raw Express handler that bypasses the pattern.
 */
export function auditSafetyNetMiddleware(req: Request, res: Response, next: NextFunction): void {
  const mutatingMethods = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

  res.on('finish', () => {
    if (
      mutatingMethods.has(req.method) &&
      res.statusCode < 400 &&
      !(req as any).__transactionCommitted &&
      !(req as any).__handlerUsed
    ) {
      logger.fatal(
        {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
        },
        'AUDIT_BYPASS_DETECTED: A mutating route completed successfully without ' +
        'going through mutationHandler. This request was NOT wrapped in a ' +
        'transaction and may have no audit entry.',
      );
    }
  });

  next();
}

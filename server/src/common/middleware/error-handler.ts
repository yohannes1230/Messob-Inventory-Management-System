/**
 * Global Express error handler.
 *
 * Catches AppError subclasses → structured JSON response with correct status.
 * Catches unexpected errors → 500 with sanitized message (no stack in production).
 */

import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/env.js';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  // Log the error
  if (err instanceof AppError && err.isOperational) {
    logger.warn(
      { err, requestId: req.id, method: req.method, path: req.path },
      err.message,
    );
  } else {
    logger.error(
      { err, requestId: req.id, method: req.method, path: req.path },
      'Unhandled error',
    );
  }

  // Determine status and response shape
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // Unexpected error — don't leak internals in production
  const message =
    config.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message;

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message,
      ...(config.NODE_ENV !== 'production' && { stack: err.stack }),
    },
  });
}

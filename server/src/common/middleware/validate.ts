/**
 * Zod validation middleware (NFR-SEC-07).
 *
 * Factory that takes a Zod schema and returns Express middleware
 * validating req.body (and optionally req.query, req.params).
 */

import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../utils/errors.js';

export interface ValidateOptions {
  /** Validate req.body against this schema. */
  body?: ZodSchema;
  /** Validate req.query against this schema. */
  query?: ZodSchema;
  /** Validate req.params against this schema. */
  params?: ZodSchema;
}

/**
 * Validates the request against the provided Zod schema(s).
 *
 * Usage:
 *   router.post('/users', validate({ body: CreateUserSchema }), handler)
 *   router.get('/users', validate({ query: PaginationSchema }), handler)
 */
export function validate(schemas: ZodSchema | ValidateOptions) {
  // If a single schema is passed, assume it's for the body
  const options: ValidateOptions =
    'body' in schemas || 'query' in schemas || 'params' in schemas
      ? (schemas as ValidateOptions)
      : { body: schemas as ZodSchema };

  return (req: Request, _res: Response, next: NextFunction): void => {
    const errors: Array<{ location: string; issues: ZodError['issues'] }> = [];

    if (options.body) {
      const result = options.body.safeParse(req.body);
      if (!result.success) {
        errors.push({ location: 'body', issues: result.error.issues });
      } else {
        req.body = result.data;
      }
    }

    if (options.query) {
      const result = options.query.safeParse(req.query);
      if (!result.success) {
        errors.push({ location: 'query', issues: result.error.issues });
      } else {
        (req as any).validatedQuery = result.data;
      }
    }

    if (options.params) {
      const result = options.params.safeParse(req.params);
      if (!result.success) {
        errors.push({ location: 'params', issues: result.error.issues });
      } else {
        (req as any).validatedParams = result.data;
      }
    }

    if (errors.length > 0) {
      const details = errors.flatMap((e) =>
        e.issues.map((issue) => ({
          location: e.location,
          path: issue.path.join('.'),
          message: issue.message,
        })),
      );
      return next(new ValidationError('Validation failed', details));
    }

    next();
  };
}

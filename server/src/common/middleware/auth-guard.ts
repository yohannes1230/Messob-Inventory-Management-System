/**
 * JWT auth guard middleware.
 *
 * Verifies the Authorization: Bearer <token> header, decodes the JWT,
 * and attaches the decoded payload to req.user.
 */

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { UnauthorizedError } from '../utils/errors.js';
import type { IAccessTokenPayload } from '@am-pms/shared-types';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: IAccessTokenPayload;
    }
  }
}

export function authGuard(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or malformed Authorization header'));
  }

  const token = authHeader.slice(7); // Remove 'Bearer '

  try {
    const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET) as IAccessTokenPayload;
    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(new UnauthorizedError('Access token expired', 'TOKEN_EXPIRED'));
    }
    if (err instanceof jwt.JsonWebTokenError) {
      return next(new UnauthorizedError('Invalid access token', 'TOKEN_INVALID'));
    }
    next(new UnauthorizedError('Authentication failed'));
  }
}

/**
 * Redis-backed sliding window rate limiter (NFR-SEC-06, FR-API-04).
 *
 * Uses a simple Redis INCR + EXPIRE pattern per key (IP or user).
 * Auth endpoints: 5 req/min/IP (Design Doc §9).
 * General mutating endpoints: configurable.
 */

import type { Request, Response, NextFunction } from 'express';
import { redisClient } from '../config/redis.js';
import { TooManyRequestsError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export interface RateLimitOptions {
  /** Max requests allowed in the window. Default: 5. */
  maxRequests?: number;
  /** Window duration in seconds. Default: 60. */
  windowSeconds?: number;
  /** Key generator. Default: uses IP address. */
  keyGenerator?: (req: Request) => string;
  /** Optional prefix for Redis keys. */
  prefix?: string;
}

export function rateLimiter(options: RateLimitOptions = {}) {
  const {
    maxRequests = 5,
    windowSeconds = 60,
    keyGenerator = (req) => req.ip || 'unknown',
    prefix = 'rl',
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = `${prefix}:${keyGenerator(req)}`;

    try {
      const current = await redisClient.incr(key);

      if (current === 1) {
        await redisClient.expire(key, windowSeconds);
      }

      // Set rate limit headers (RFC 6585 convention)
      res.set('X-RateLimit-Limit', String(maxRequests));
      res.set('X-RateLimit-Remaining', String(Math.max(0, maxRequests - current)));

      if (current > maxRequests) {
        const ttl = await redisClient.ttl(key);
        res.set('Retry-After', String(ttl));

        logger.warn(
          { ip: req.ip, path: req.path, key, current, maxRequests },
          'Rate limit exceeded',
        );

        return next(
          new TooManyRequestsError(
            `Rate limit exceeded. Try again in ${ttl} seconds.`,
          ),
        );
      }

      next();
    } catch (err) {
      // If Redis is down, allow the request (fail-open for availability)
      // but log the error for monitoring
      logger.error({ err, key }, 'Rate limiter Redis error — failing open');
      next();
    }
  };
}

/** Pre-configured rate limiter for auth endpoints: 5/min per IP. */
export const authRateLimiter = rateLimiter({
  maxRequests: 5,
  windowSeconds: 60,
  prefix: 'rl:auth',
});

/**
 * Redis client setup.
 */

import { Redis } from 'ioredis';
import { config } from './env.js';
import { logger } from '../utils/logger.js';

export const redisClient = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times: number) {
    const delay = Math.min(times * 200, 3000);
    return delay;
  },
  lazyConnect: true,
});

redisClient.on('connect', () => {
  logger.info('Connected to Redis');
});

redisClient.on('error', (err: any) => {
  logger.error({ err }, 'Redis connection error');
});

export async function connectRedis(): Promise<void> {
  await redisClient.connect();
}

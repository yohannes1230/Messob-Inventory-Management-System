/**
 * Global test setup: MongoMemoryReplSet + in-memory Redis mock.
 */

process.env.NODE_ENV = 'test';
process.env.PORT = '4001';
process.env.JWT_ACCESS_SECRET = 'test-jwt-access-secret-at-least-16-chars';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-at-least-16-chars';
process.env.JWT_ACCESS_EXPIRY = '15m';
process.env.JWT_REFRESH_EXPIRY = '7d';
process.env.BCRYPT_SALT_ROUNDS = '10'; // faster in tests
process.env.LOCKOUT_THRESHOLD = '5';
process.env.LOCKOUT_DURATION_MINUTES = '15';
process.env.PASSWORD_MIN_LENGTH = '8';
process.env.PASSWORD_COMPLEXITY_REGEX = '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*]).{8,}$';
process.env.PASSWORD_EXPIRY_DAYS = '90';
process.env.PASSWORD_HISTORY_COUNT = '5';
process.env.TOKEN_CLEANUP_GRACE_DAYS = '30';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.MONGO_URI = 'mongodb://localhost:27017/test_placeholder';

import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { redisClient } from '../src/common/config/redis.js';
import { seedAuthData } from '../src/modules/auth/auth.seed.js';

let replSet: MongoMemoryReplSet;

// In-memory Redis simulation for rate limiter
const redisStore = new Map<string, { value: number; expiresAt?: number }>();

redisClient.incr = (async (key: string) => {
  const item = redisStore.get(key) || { value: 0 };
  item.value += 1;
  redisStore.set(key, item);
  return item.value;
}) as any;

redisClient.expire = (async (key: string, seconds: number) => {
  const item = redisStore.get(key);
  if (item) {
    item.expiresAt = Date.now() + seconds * 1000;
  }
  return 1;
}) as any;

redisClient.ttl = (async (key: string) => {
  const item = redisStore.get(key);
  if (!item || !item.expiresAt) return -1;
  const remaining = Math.ceil((item.expiresAt - Date.now()) / 1000);
  return remaining > 0 ? remaining : -2;
}) as any;

redisClient.connect = (async () => {}) as any;
redisClient.disconnect = (async () => {}) as any;

beforeAll(async () => {
  // Start 1-node replica set to support Mongoose multi-document transactions
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
    instanceOpts: [{ launchTimeout: 60000 }],
  });

  const uri = replSet.getUri();
  await mongoose.disconnect();
  await mongoose.connect(uri);
  await seedAuthData();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (replSet) {
    await replSet.stop();
  }
});

beforeEach(async () => {
  redisStore.clear();
  // Clear non-system collections between tests
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const col = collections[key];
    if (col && key !== 'roles') {
      await col.deleteMany({});
    }
  }
});

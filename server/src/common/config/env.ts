/**
 * Environment configuration — Zod-validated, fail-fast at startup.
 *
 * Every required env var is validated here. If any are missing or malformed,
 * the process exits immediately with a descriptive error, rather than
 * failing silently at first use deep inside a request handler.
 */

import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),

  // ── Database ──
  MONGO_URI: z.string().min(1, 'MONGO_URI must be a valid MongoDB connection string').default('mongodb://127.0.0.1:27017/am_pms_dev'),

  // ── Cache / Queue ──
  REDIS_URL: z.string().min(1, 'REDIS_URL must be a valid Redis connection string').default('redis://127.0.0.1:6379'),

  // ── Auth (Design Doc §9) ──
  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 characters').default('test-jwt-access-secret-at-least-16-chars'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 characters').default('test-jwt-refresh-secret-at-least-16-chars'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

  // ── Password policy ──
  PASSWORD_MIN_LENGTH: z.coerce.number().int().min(6).default(8),
  PASSWORD_COMPLEXITY_REGEX: z
    .string()
    .default('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*]).{8,}$'),
  PASSWORD_EXPIRY_DAYS: z.coerce.number().int().min(0).default(90),
  PASSWORD_HISTORY_COUNT: z.coerce.number().int().min(0).default(5),

  // ── Account lockout ──
  LOCKOUT_THRESHOLD: z.coerce.number().int().min(1).default(5),
  LOCKOUT_DURATION_MINUTES: z.coerce.number().int().min(1).default(15),

  // ── MFA ──
  MFA_ISSUER: z.string().default('AM-PMS'),

  // ── Object storage (MinIO / S3) ──
  OBJECT_STORAGE_ENDPOINT: z.string().optional(),
  OBJECT_STORAGE_ACCESS_KEY: z.string().optional(),
  OBJECT_STORAGE_SECRET_KEY: z.string().optional(),
  OBJECT_STORAGE_BUCKET: z.string().optional(),

  // ── Notifications ──
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMS_GATEWAY_API_KEY: z.string().optional(),

  // ── CORS ──
  WEB_APP_ORIGIN: z.string().default('http://localhost:5173'),

  // ── Token cleanup ──
  TOKEN_CLEANUP_GRACE_DAYS: z.coerce.number().int().min(1).default(30),
});

export type EnvConfig = z.infer<typeof envSchema>;

function loadConfig(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    console.error(`\n❌ Invalid environment configuration:\n${formatted}\n`);
    process.exit(1);
  }

  return result.data;
}

/** Validated, typed environment configuration. */
export const config = loadConfig();

/**
 * Express application setup.
 *
 * Middleware order:
 *   1. requestIdMiddleware — attach correlation ID
 *   2. Security middleware (helmet, cors, cookie-parser)
 *   3. Body parsing
 *   4. Audit safety-net listener (attaches res.on('finish'))
 *   5. API routes
 *   6. 404 handler
 *   7. Global error handler
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { config } from './common/config/env.js';
import { logger, requestIdMiddleware } from './common/utils/index.js';
import { auditSafetyNetMiddleware, errorHandler } from './common/middleware/index.js';
import { authRouter } from './modules/auth/index.js';
import { auditRouter } from './modules/audit/index.js';
import { masterDataRouter } from './modules/masterdata/masterdata.routes.js';
import { customFieldRouter } from './modules/customfields/customfield.routes.js';
import { assetRouter } from './modules/assets/asset.routes.js';
import { assignmentRouter } from './modules/assignments/assignment.routes.js';
import { NotFoundError } from './common/utils/errors.js';

export const app = express();

// ── 1. Request ID ──
app.use(requestIdMiddleware);

// ── 2. Logging ──
app.use(
  (pinoHttp as any)({
    logger,
    genReqId: (req: any) => req.id,
    autoLogging: config.NODE_ENV !== 'test',
  }),
);

// ── 3. Security ──
app.use(helmet());
app.use(
  cors({
    origin: config.WEB_APP_ORIGIN,
    credentials: true, // Allow cookies for refresh tokens
  }),
);
app.use(cookieParser());

// ── 4. Body parsing ──
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ── 5. Audit safety-net ──
app.use(auditSafetyNetMiddleware);

// ── 6. API routes ──
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/audit-logs', auditRouter);
app.use('/api/v1', masterDataRouter);
app.use('/api/v1', customFieldRouter);
app.use('/api/v1/assets', assetRouter);
app.use('/api/v1/assignments', assignmentRouter);

// ── 7. Health check ──
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 8. 404 ──
app.use((_req, _res, next) => {
  next(new NotFoundError('Endpoint not found'));
});

// ── 9. Error handler (must be last) ──
app.use(errorHandler);

/**
 * Token cleanup job (Revision 4 + Correction #3).
 *
 * Runs on a configurable interval (default: daily).
 *
 * Steps:
 *   1. Transition abandoned active tokens (expiresAt < now, status: 'active')
 *      to status: 'expired'. This catches the most common case: a user
 *      closes the browser and never refreshes — the token stays 'active'
 *      forever without this step.
 *   2. Hard-delete tokens with terminal statuses ('expired', 'revoked',
 *      'consumed') that are past the grace period (default: 30 days).
 */

import { refreshTokenRepository } from '../modules/auth/auth.repository.js';
import { config } from '../common/config/env.js';
import { logger } from '../common/utils/logger.js';

const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function scheduleTokenCleanup(): void {
  logger.info(
    { intervalMs: CLEANUP_INTERVAL_MS, graceDays: config.TOKEN_CLEANUP_GRACE_DAYS },
    'Scheduled token cleanup job',
  );

  // Run immediately on startup, then on interval
  runCleanup();
  setInterval(runCleanup, CLEANUP_INTERVAL_MS);
}

export async function runCleanup(): Promise<{ transitioned: number; deleted: number }> {
  try {
    // Step 1: Transition abandoned 'active' tokens whose expiresAt has passed.
    // These are sessions where the user never called /auth/refresh after expiry.
    const transitioned = await refreshTokenRepository.transitionAbandonedToExpired();

    if (transitioned > 0) {
      logger.info(
        { count: transitioned },
        'Transitioned abandoned active tokens to expired',
      );
    }

    // Step 2: Hard-delete terminal-status tokens past the grace period.
    const deleted = await refreshTokenRepository.deleteExpiredBeyondGrace(
      config.TOKEN_CLEANUP_GRACE_DAYS,
    );

    if (deleted > 0) {
      logger.info(
        { count: deleted, graceDays: config.TOKEN_CLEANUP_GRACE_DAYS },
        'Deleted expired/revoked/consumed tokens past grace period',
      );
    }

    return { transitioned, deleted };
  } catch (err) {
    logger.error({ err }, 'Token cleanup job failed');
    return { transitioned: 0, deleted: 0 };
  }
}

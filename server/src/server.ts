/**
 * Server bootstrap — connects to MongoDB & Redis, seeds data, starts HTTP.
 */

import { app } from './app.js';
import { config, connectDatabase, connectRedis } from './common/config/index.js';
import { logger } from './common/utils/logger.js';
import { seedAuthData } from './modules/auth/index.js';
import { scheduleTokenCleanup } from './jobs/token-cleanup.job.js';
import { initSocketServer } from './sockets/index.js';

async function bootstrap(): Promise<void> {
  try {
    // Connect to database
    await connectDatabase();

    // Connect to Redis
    await connectRedis();

    // Seed default roles and admin user
    await seedAuthData();

    // Schedule token cleanup job
    scheduleTokenCleanup();

    // Start HTTP server
    const server = app.listen(config.PORT, () => {
      logger.info(
        { port: config.PORT, env: config.NODE_ENV },
        '🚀 AM-PMS API server started',
      );
    });

    // Initialize Socket.IO server (FR-ESS-07)
    initSocketServer(server);

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Shutting down gracefully...');
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });

      // Force shutdown after 10s
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Unhandled rejection handler
    process.on('unhandledRejection', (reason) => {
      logger.fatal({ reason }, 'Unhandled promise rejection');
      process.exit(1);
    });
  } catch (err) {
    logger.fatal({ err }, 'Failed to start server');
    process.exit(1);
  }
}

bootstrap();

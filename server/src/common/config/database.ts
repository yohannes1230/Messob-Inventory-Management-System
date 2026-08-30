/**
 * MongoDB connection setup with retry logic.
 */

import mongoose from 'mongoose';
import { config } from './env.js';
import { logger } from '../utils/logger.js';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

export async function connectDatabase(): Promise<typeof mongoose> {
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      const conn = await mongoose.connect(config.MONGO_URI, {
        // Mongoose 8 uses the new driver defaults, but be explicit:
        serverSelectionTimeoutMS: 5000,
        heartbeatFrequencyMS: 10000,
      });

      logger.info(
        { host: conn.connection.host, name: conn.connection.name },
        'Connected to MongoDB',
      );

      // Log disconnection events
      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
      });
      mongoose.connection.on('error', (err) => {
        logger.error({ err }, 'MongoDB connection error');
      });

      return conn;
    } catch (err) {
      retries++;
      logger.warn(
        { err, attempt: retries, maxRetries: MAX_RETRIES },
        'Failed to connect to MongoDB, retrying...',
      );

      if (retries >= MAX_RETRIES) {
        logger.fatal({ err }, 'Exhausted MongoDB connection retries');
        throw err;
      }

      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }

  // Unreachable, but TypeScript needs it
  throw new Error('Failed to connect to MongoDB');
}

export { mongoose };

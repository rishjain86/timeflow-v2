import { Redis } from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

// Declare a variable to hold the Redis client instance
let redis: Redis | null = null;

if (env.REDIS_URL) {
  // Initialize Redis client
  redis = new Redis(env.REDIS_URL, {
    // Retry strategy for production resilience
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: null,
  });

  // Event Listeners for monitoring
  redis.on('connect', () => {
    logger.info('🟢 Redis client connected successfully');
  });

  redis.on('ready', () => {
    logger.info('✅ Redis client is ready to receive commands');
  });

  redis.on('error', (error) => {
    logger.error({ err: error }, '🔴 Redis client connection error');
  });

  redis.on('close', () => {
    logger.warn('🟡 Redis client connection closed');
  });
} else {
  logger.warn('⚠️ REDIS_URL is not defined in environment variables. Redis features will be disabled.');
}

export default redis;

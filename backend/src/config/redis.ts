import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

let redisClient: RedisClientType | null = null;
let redisEnabled = true; // Flag to track if Redis is available
let connectionAttempted = false; // Track if connection was attempted

/**
 * Check if Redis is enabled via environment variable
 * REDIS_ENABLED=false can be used to disable Redis entirely
 */
const isRedisEnabled = (): boolean => {
  const redisEnabledEnv = process.env.REDIS_ENABLED?.toLowerCase();
  if (redisEnabledEnv === 'false' || redisEnabledEnv === '0') {
    return false;
  }
  return true;
};

/**
 * Connect to Redis with graceful degradation
 * Returns RedisClientType if successful, null if Redis is unavailable
 * App will continue to function without Redis (caching will be disabled)
 */
export const connectRedis = async (): Promise<RedisClientType | null> => {
  connectionAttempted = true;

  // Check if Redis is explicitly disabled
  if (!isRedisEnabled()) {
    logger.info('Redis is disabled via REDIS_ENABLED environment variable');
    logger.info('Application will run without caching');
    redisEnabled = false;
    return null;
  }

  try {
    const redisURL = process.env.REDIS_URL;

    if (!redisURL) {
      logger.warn('REDIS_URL environment variable is not set.');
      logger.warn('Redis caching will be disabled. Set REDIS_URL in your .env file to enable caching.');
      redisEnabled = false;
      return null;
    }

    logger.info(`Attempting to connect to Redis at ${redisURL}...`);

    // Parse Redis URL to extract connection details
    const url = new URL(redisURL);
    const password = url.password || undefined;
    const database = url.pathname ? parseInt(url.pathname.slice(1)) : 0;

    // Configure Redis client options with shorter timeouts for faster failure
    const redisOptions = {
      url: redisURL,
      password: password,
      database: database,
      socket: {
        connectTimeout: 5000, // 5 seconds connection timeout (reduced from 30s)
        reconnectStrategy: (retries: number) => {
          // Limit reconnection attempts in development
          if (retries > 3) {
            logger.warn('Redis reconnection failed after 3 attempts. Disabling Redis.');
            redisEnabled = false;
            return new Error('Max reconnection attempts reached');
          }
          const delay = Math.min(retries * 1000, 5000);
          logger.debug(`Redis reconnecting in ${delay / 1000}s... (attempt ${retries})`);
          return delay;
        },
        keepAlive: true, // Enable TCP keep-alive
      },
      // Retry on commands
      commandsQueueMaxLength: 1000,
      disableOfflineQueue: true, // Don't queue commands when disconnected
    };

    redisClient = createClient(redisOptions);

    // Event handlers with graceful degradation
    redisClient.on('error', (err) => {
      logger.warn('Redis Client Error:', err.message);
      logger.debug('Application continues without caching');
      redisEnabled = false;
    });

    redisClient.on('connect', () => {
      logger.info('Redis Client Connected');
      redisEnabled = true;
    });

    redisClient.on('ready', () => {
      logger.info('Redis Client Ready - Caching enabled');
      redisEnabled = true;
    });

    redisClient.on('end', () => {
      logger.warn('Redis Client Disconnected - Caching disabled');
      redisEnabled = false;
    });

    redisClient.on('reconnecting', () => {
      logger.debug('Redis Client Reconnecting...');
    });

    // Attempt connection with limited retries
    let retries = 2; // Reduced from 5 for faster failure
    let lastError: any;

    while (retries > 0) {
      try {
        await redisClient.connect();
        logger.info(`✓ Redis connected successfully to ${url.hostname}:${url.port}`);
        logger.info('✓ Caching layer is active');
        redisEnabled = true;
        return redisClient;
      } catch (err) {
        lastError = err;
        retries--;
        if (retries > 0) {
          const delay = 2000; // Fixed 2s delay between retries
          logger.debug(`Redis connection failed. Retrying in ${delay / 1000}s... (${retries} retries left)`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // If we get here, all retries failed
    throw lastError;
  } catch (error: any) {
    logger.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.warn('Redis Connection Failed');
    logger.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.warn(`Reason: ${error.message || 'Unknown error'}`);
    logger.warn('');
    logger.warn('Application will continue WITHOUT caching:');
    logger.warn('  • Link redirects will query MongoDB directly');
    logger.warn('  • Analytics will be calculated in real-time');
    logger.warn('  • Performance may be reduced');
    logger.warn('');
    logger.warn('To enable caching:');
    logger.warn('  1. Start Redis server locally: redis-server');
    logger.warn('  2. Or install Redis: brew install redis (macOS)');
    logger.warn('  3. Or set REDIS_ENABLED=false to silence this warning');
    logger.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.warn('');

    redisEnabled = false;
    redisClient = null;
    return null;
  }
};

/**
 * Get Redis client if available
 * Returns null if Redis is not connected (graceful degradation)
 * Callers should handle null and implement fallback logic
 */
export const getRedisClient = (): RedisClientType | null => {
  // If connection hasn't been attempted yet, log a warning
  if (!connectionAttempted) {
    logger.debug('Redis connection not yet attempted');
    return null;
  }

  // If Redis is disabled or unavailable, return null
  if (!redisEnabled || !redisClient) {
    return null;
  }

  // Check if client is ready and open
  if (!redisClient.isReady || !redisClient.isOpen) {
    logger.debug('Redis client exists but is not ready/open');
    return null;
  }

  return redisClient;
};

/**
 * Check if Redis is available and ready to use
 */
export const isRedisAvailable = (): boolean => {
  return redisEnabled && redisClient !== null && redisClient.isReady && redisClient.isOpen;
};

/**
 * Disconnect from Redis gracefully
 */
export const disconnectRedis = async (): Promise<void> => {
  if (redisClient && redisClient.isOpen) {
    try {
      await redisClient.quit();
      logger.info('Redis disconnected gracefully');
    } catch (error) {
      logger.warn('Error disconnecting Redis:', error);
    } finally {
      redisClient = null;
      redisEnabled = false;
    }
  }
};

import IORedis, { RedisOptions } from 'ioredis';
import logger from '../utils/logger';

const REDIS_URL = process.env.REDIS_URL;

/**
 * Shared Redis Connection Pool
 *
 * Centralizes all Redis connections to prevent connection sprawl.
 * Previously, 6 separate files each created their own Redis client,
 * leading to 6+ connections per process. This module provides:
 *
 * - `generalClient`: For caching, idempotency, and general key-value ops.
 * - `bullMqConnection`: For BullMQ workers/queues (requires maxRetriesPerRequest: null).
 */

let _generalClient: IORedis | null = null;
let _bullMqConnection: IORedis | null = null;

function createClient(name: string, overrides: Partial<RedisOptions> = {}): IORedis | null {
  if (!REDIS_URL) return null;

  const client = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 50, 2000),
    lazyConnect: false,
    ...overrides,
  });

  client.on('error', (err) => {
    logger.warn(`[Redis:${name}] Connection error:`, err.message);
  });

  client.on('connect', () => {
    logger.info(`[Redis:${name}] Connected.`);
  });

  return client;
}

export function getRedisClient(): IORedis | null {
  if (!_generalClient && REDIS_URL) {
    _generalClient = createClient('general');
  }
  return _generalClient;
}

export function getBullMqConnection(): IORedis | null {
  if (!_bullMqConnection && REDIS_URL) {
    _bullMqConnection = createClient('bullmq', {
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
    });
  }
  return _bullMqConnection;
}

export async function redisHealthCheck(): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;
  try {
    const result = await client.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}

export const isRedisConfigured = !!REDIS_URL;

import { Redis, RedisOptions } from 'ioredis';
import logger from '../utils/logger';

const REDIS_URL =
  process.env.REDIS_URL?.trim() ||
  process.env.UPSTASH_REDIS_URL?.trim() ||
  process.env.RENDER_REDIS_URL?.trim() ||
  '';

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

let _generalClient: Redis | null = null;
let _bullMqConnection: Redis | null = null;

export function getRedisUrl(): string | null {
  return REDIS_URL || null;
}

export function buildRedisOptions(overrides: Partial<RedisOptions> = {}): RedisOptions {
  const options: RedisOptions = {
    lazyConnect: true,
    enableOfflineQueue: false,
    enableReadyCheck: true,
    maxRetriesPerRequest: 1,
    connectTimeout: 5000,
    retryStrategy: (times) => Math.min(times * 200, 2000),
    ...overrides,
  };

  const needsTls =
    REDIS_URL.startsWith('rediss://') ||
    /upstash\.io/i.test(REDIS_URL) ||
    process.env.REDIS_TLS === 'true';

  if (needsTls && REDIS_URL) {
    try {
      const hostname = new URL(REDIS_URL).hostname;
      options.tls = {
        servername: hostname,
        ...(options.tls || {}),
      };
    } catch (error) {
      logger.warn('[Redis] Failed to derive TLS hostname from REDIS_URL');
    }
  }

  return options;
}

function createClient(name: string, overrides: Partial<RedisOptions> = {}): Redis | null {
  if (!REDIS_URL) return null;

  const client = new Redis(REDIS_URL, buildRedisOptions(overrides));

  client.on('error', (err) => {
    logger.warn(`[Redis:${name}] Connection error:`, err.message);
  });

  client.on('ready', () => {
    logger.info(`[Redis:${name}] Ready.`);
  });

  client.connect().catch((err) => {
    logger.warn(`[Redis:${name}] Initial connect failed: ${err.message}`);
  });

  return client;
}

/**
 * General-purpose Redis client for caching, auth, idempotency, rate limiting.
 * Returns null if REDIS_URL is not configured — callers should degrade gracefully.
 */
export function getRedisClient(): Redis | null {
  if (!_generalClient && REDIS_URL) {
    _generalClient = createClient('general');
  }
  return _generalClient;
}

/**
 * BullMQ-specific Redis connection. BullMQ requires maxRetriesPerRequest: null.
 * Returns null if REDIS_URL is not configured.
 */
export function getBullMqConnection(): Redis | null {
  if (!_bullMqConnection && REDIS_URL) {
    _bullMqConnection = createClient('bullmq', {
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
    });
  }
  return _bullMqConnection;
}

export async function ensureRedisConnection(client: Redis | null = getRedisClient()): Promise<Redis | null> {
  if (!client) return null;

  try {
    const status = client.status;
    if (status === 'ready') return client;

    if (status === 'wait') {
      await client.connect();
    } else if (status === 'end') {
      return null;
    }

    if (client.status !== 'ready') {
      await client.ping();
    }

    return client.status === 'ready' ? client : null;
  } catch {
    return null;
  }
}

/**
 * Health check — pings the general Redis client.
 */
export async function redisHealthCheck(): Promise<boolean> {
  const client = await ensureRedisConnection();
  if (!client) return false;
  try {
    const result = await client.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}

/**
 * Whether Redis is configured at all.
 */
export const isRedisConfigured = !!REDIS_URL;

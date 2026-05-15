import logger from '../utils/logger';
import { ensureRedisConnection, getRedisClient } from '../config/redis';

type MemoryEntry = {
  value: string;
  expiresAt: number;
};

class CacheService {
  private readonly DEFAULT_TTL = 60; // 60 seconds
  private readonly memoryCache = new Map<string, MemoryEntry>();

  constructor() {
    const redis = getRedisClient();
    if (!redis) {
      logger.warn('CacheService: Redis unavailable, using in-memory cache fallback.');
    }
  }

  private getMemory(key: string): string | null {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }
    return entry.value;
  }

  private setMemory(key: string, value: string, ttl: number) {
    this.memoryCache.set(key, {
      value,
      expiresAt: Date.now() + (ttl * 1000),
    });
  }

  async getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttl = this.DEFAULT_TTL): Promise<T> {
    const redis = await ensureRedisConnection();

    try {
      if (redis) {
        const cached = await redis.get(key);
        if (cached) {
          return JSON.parse(cached);
        }
      } else {
        const cached = this.getMemory(key);
        if (cached) {
          return JSON.parse(cached);
        }
      }
    } catch (error) {
      logger.warn(`Cache read error for key ${key}:`, error);
    }

    const freshData = await fetchFn();

    try {
      const serialized = JSON.stringify(freshData);
      if (redis) {
        await redis.set(key, serialized, 'EX', ttl);
      } else {
        this.setMemory(key, serialized, ttl);
      }
    } catch (error) {
      logger.warn(`Cache write error for key ${key}:`, error);
    }

    return freshData;
  }

  async invalidate(key: string) {
    const redis = await ensureRedisConnection();

    try {
      if (redis) {
        await redis.del(key);
      }
      this.memoryCache.delete(key);
    } catch (error) {
      logger.warn(`Cache invalidation error for key ${key}:`, error);
    }
  }

  /**
   * Invalidate all keys matching a pattern (e.g., 'policies:org:*').
   * Useful for bulk invalidation when policies are updated.
   */
  async invalidatePattern(pattern: string) {
    const redis = await ensureRedisConnection();

    try {
      if (redis) {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
          logger.info(`Cache: invalidated ${keys.length} keys matching ${pattern}`);
        }
      }
    } catch (error) {
      logger.warn(`Cache pattern invalidation error for ${pattern}:`, error);
    }
  }

  /**
   * Health check — reuses the existing connection (no leak).
   */
  async ping(): Promise<boolean> {
    try {
      const redis = await ensureRedisConnection();
      if (!redis) return false;
      const result = await redis.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }
}

export const cacheService = new CacheService();

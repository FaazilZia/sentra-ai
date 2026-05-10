import logger from '../utils/logger';
import { getRedisClient } from '../config/redis';

class CacheService {
  private readonly DEFAULT_TTL = 60;

  private get redis() {
    return getRedisClient();
  }

  async getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttl = this.DEFAULT_TTL): Promise<T> {
    const client = this.redis;
    if (client) {
      try {
        const cached = await client.get(key);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        logger.warn(`Cache read error for key ${key}:`, error);
      }
    }

    const freshData = await fetchFn();

    if (client) {
      try {
        await client.set(key, JSON.stringify(freshData), 'EX', ttl);
      } catch (error) {
        logger.warn(`Cache write error for key ${key}:`, error);
      }
    }

    return freshData;
  }

  async invalidate(key: string) {
    const client = this.redis;
    if (!client) return;
    try {
      await client.del(key);
    } catch (error) {
      logger.warn(`Cache invalidation error for key ${key}:`, error);
    }
  }

  async invalidatePattern(pattern: string) {
    const client = this.redis;
    if (!client) return;
    try {
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(...keys);
        logger.info(`Cache: invalidated ${keys.length} keys matching ${pattern}`);
      }
    } catch (error) {
      logger.warn(`Cache pattern invalidation error for ${pattern}:`, error);
    }
  }

  async ping(): Promise<boolean> {
    const client = this.redis;
    if (!client) return false;
    try {
      const result = await client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }
}

export const cacheService = new CacheService();

import IORedis from 'ioredis';
import logger from '../utils/logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

class CacheService {
  private redis: IORedis;
  private readonly DEFAULT_TTL = 60; // 60 seconds

  constructor() {
    this.redis = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });

    this.redis.on('error', (err) => {
      logger.warn('Redis Cache Error:', err);
    });
  }

  async getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttl = this.DEFAULT_TTL): Promise<T> {
    try {
      const cached = await this.redis.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.warn(`Cache read error for key ${key}:`, error);
    }

    const freshData = await fetchFn();
    
    try {
      await this.redis.set(key, JSON.stringify(freshData), 'EX', ttl);
    } catch (error) {
      logger.warn(`Cache write error for key ${key}:`, error);
    }

    return freshData;
  }

  async invalidate(key: string) {
    try {
      await this.redis.del(key);
    } catch (error) {
      logger.warn(`Cache invalidation error for key ${key}:`, error);
    }
  }
}

export const cacheService = new CacheService();


import { policies } from '@prisma/client';

interface CacheItem<T> {
  data: T;
  expiry: number;
}

class CacheService {
  private cache = new Map<string, CacheItem<any>>();
  private readonly DEFAULT_TTL = 30000; // 30 seconds

  async getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttl = this.DEFAULT_TTL): Promise<T> {
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    const freshData = await fetchFn();
    this.cache.set(key, {
      data: freshData,
      expiry: Date.now() + ttl
    });

    return freshData;
  }

  invalidate(key: string) {
    this.cache.delete(key);
  }
}

export const cacheService = new CacheService();

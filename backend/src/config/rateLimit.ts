import rateLimit, { MemoryStore } from 'express-rate-limit';
import * as IORedis from 'ioredis';

const Redis = (IORedis.default || IORedis) as any;

// A robust production-grade fallback store wrapper that delegates to a local in-memory store
// if Redis encounters connection issues, timeouts, or command execution failures.
// It automatically recovers and resumes writing to Redis the moment the Redis connection recovers.
export class ResilientRedisStore {
  private redisStore: any;
  private memoryStore: any;
  private prefix: string;
  private getRedisStatus: () => boolean;
  private setRedisStatus: (status: boolean) => void;

  constructor(redisStore: any, memoryStore: any, prefix: string, getStatus: () => boolean, setStatus: (status: boolean) => void) {
    this.redisStore = redisStore;
    this.memoryStore = memoryStore;
    this.prefix = prefix;
    this.getRedisStatus = getStatus;
    this.setRedisStatus = setStatus;
  }

  private handleStoreError(method: string, error: any) {
    console.error(`[RateLimitStore:${this.prefix}] Redis store ${method} error:`, error?.message || error);
    // Mark as degraded immediately upon failure
    if (this.getRedisStatus()) {
      console.warn(`[RateLimitStore:${this.prefix}] Redis command failed. Degrading to local in-memory rate limiting.`);
      this.setRedisStatus(false);
    }
  }

  init(options: any) {
    if (this.redisStore && typeof this.redisStore.init === 'function') {
      try {
        this.redisStore.init(options);
      } catch (err) {
        this.handleStoreError('init', err);
      }
    }
    if (this.memoryStore && typeof this.memoryStore.init === 'function') {
      this.memoryStore.init(options);
    }
  }

  async increment(key: string) {
    if (this.getRedisStatus()) {
      try {
        return await this.redisStore.increment(key);
      } catch (err) {
        this.handleStoreError('increment', err);
      }
    }
    return this.memoryStore.increment(key);
  }

  async decrement(key: string) {
    if (this.getRedisStatus()) {
      try {
        return await this.redisStore.decrement(key);
      } catch (err) {
        this.handleStoreError('decrement', err);
      }
    }
    return this.memoryStore.decrement(key);
  }

  async resetKey(key: string) {
    if (this.getRedisStatus()) {
      try {
        return await this.redisStore.resetKey(key);
      } catch (err) {
        this.handleStoreError('resetKey', err);
      }
    }
    return this.memoryStore.resetKey(key);
  }
}

export const createSafeRateLimiter = (prefix: string, options: any) => {
  // Disable express-rate-limit's built-in validation that crashes on custom keyGenerators
  // This prevents the ERR_ERL_KEY_GEN_IPV6 ValidationError that kills the process on startup
  const safeOptions = { 
    ...options, 
    validate: { 
      ...(options.validate || {}), 
      xForwardedForHeader: false, 
      default: false 
    } 
  };

  if (!process.env.REDIS_URL) {
    console.warn(`[RateLimit] REDIS_URL not set, using memory store for ${prefix}`);
    return rateLimit(safeOptions);
  }

  try {
    const RedisStore = require('rate-limit-redis').default || require('rate-limit-redis');
    
    // Status flag tracking if Redis is active and healthy
    let isRedisReady = false;

    const client = new Redis(process.env.REDIS_URL, {
      enableOfflineQueue: false, // Do not buffer commands if connection is offline (avoids memory growth)
      maxRetriesPerRequest: 3, // Fail fast on queries when disconnected
      lazyConnect: true, // Connect lazily (do not block Express boot process)
      connectTimeout: 3000, // Timeout connection attempt after 3 seconds
      retryStrategy: (times: number) => {
        if (times > 5) {
          console.warn(`[RateLimit:${prefix}] Redis connection retry limit reached. Continuing in degraded mode.`);
          isRedisReady = false;
          return null; // Stop retrying to connect
        }
        // Graceful exponential reconnect backoff
        return Math.min(times * 200, 2000);
      },
      tls: process.env.REDIS_URL.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
    });

    // Redis Health Event Listeners
    client.on('connect', () => {
      console.log(`[RateLimit:${prefix}] Redis client establishing connection...`);
    });

    client.on('ready', () => {
      console.log(`[RateLimit:${prefix}] Redis connection ready. Restoring rate limiting telemetry to Redis.`);
      isRedisReady = true;
    });

    client.on('error', (err: any) => {
      console.error(`[RateLimit:${prefix}] Redis connection error event:`, err?.message || err);
      if (isRedisReady) {
        console.warn(`[RateLimit:${prefix}] Redis became unhealthy. Transitioning to local in-memory fallback store.`);
      }
      isRedisReady = false;
    });

    client.on('reconnecting', () => {
      console.warn(`[RateLimit:${prefix}] Redis connection lost. Reconnecting...`);
      isRedisReady = false;
    });

    // Connect asynchronously to avoid blocking the main Event Loop / Express startup
    client.connect().catch((err: any) => {
      console.error(`[RateLimit:${prefix}] Redis async connect failed:`, err?.message || err);
      isRedisReady = false;
    });

    const redisStoreInstance = new RedisStore({
      sendCommand: (command: string, ...args: string[]) => {
        return client.call(command, ...args);
      },
      prefix,
    });

    const memoryStoreInstance = new MemoryStore();
    
    const resilientStore = new ResilientRedisStore(
      redisStoreInstance, 
      memoryStoreInstance, 
      prefix,
      () => isRedisReady,
      (status: boolean) => { isRedisReady = status; }
    );

    return rateLimit({
      ...safeOptions,
      store: resilientStore as any,
    });
  } catch (e: any) {
    console.error(`[RateLimit] Critical Redis store initialization crash for ${prefix}, degrading to memory store:`, e?.message || e);
    return rateLimit(safeOptions);
  }
};

export const authRateLimiter = createSafeRateLimiter('rl:auth:', {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 10 : 1000,
  message: { success: false, message: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  keyGenerator: (req: any) => {
    const ip = req.ip || '127.0.0.1';
    return `${ip}-${req.body?.email || 'anon'}`;
  }
});

export const apiRateLimiter = createSafeRateLimiter('rl:api:', {
  windowMs: 15 * 60 * 1000,
  max: 2000, 
  message: { success: false, message: 'Too many requests from this IP' },
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true
});

export const aiActionRateLimiter = createSafeRateLimiter('rl:ai:min:', {
  windowMs: 60 * 1000, // 1 minute
  max: 30, 
  message: { success: false, message: 'Burst rate limit exceeded for AI actions. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: false,
  keyGenerator: (req: any) => {
    return (req.headers['x-api-key'] as string) || (req.user?.organizationId) || req.ip || 'global';
  }
});

export const aiDailyRateLimiter = createSafeRateLimiter('rl:ai:day:', {
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 1000, 
  message: { success: false, message: 'Daily quota exceeded for AI actions. Please upgrade your plan.' },
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: false,
  keyGenerator: (req: any) => {
    return (req.headers['x-api-key'] as string) || (req.user?.organizationId) || req.ip || 'global';
  }
});

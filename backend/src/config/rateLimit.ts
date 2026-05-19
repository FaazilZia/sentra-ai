/**
 * Sentra AI Production-Grade Resilient Rate Limiter
 * 
 * KNOWN-COMPATIBLE RUNTIME DEPENDENCY VERSIONS:
 * - express-rate-limit: ^8.3.2
 * - rate-limit-redis: ^4.3.1
 * - ioredis: ^5.10.1
 * 
 * DESIGN PRINCIPLES:
 * 1. Startup Resiliency: Boot never blocks or fails due to Redis outages.
 * 2. Safe Fallback: Degrades instantly to local in-memory stores during Redis downtimes.
 * 3. Circuit Breaker Protection: Prevents reconnect thrashing or command flood loops during outages.
 * 4. Command Timeout Guards: Restricts queries to 1000ms to avoid clogging request threads.
 * 5. Leak-Free Reconnection: Safely cleans up event listeners before registering new ones.
 * 6. Observability Telemetry: Connects cleanly to backend API readiness and health status endpoints.
 */

import rateLimit, { MemoryStore } from 'express-rate-limit';
import * as IORedis from 'ioredis';

const Redis = (IORedis.default || IORedis) as any;

// Global tracking variables for status telemetry
let globalRedisHealthy = false;
let globalRedisMode = 'Disabled';

export const getRateLimitRedisStatus = (): string => {
  if (!process.env.REDIS_URL) return 'disabled (local memory)';
  return globalRedisHealthy ? 'connected (distributed)' : 'degraded (local memory fallback)';
};

// Protects Redis queries from hanging indefinitely by enforcing a strict execution timeout
export const withTimeout = <T>(promise: Promise<T>, ms: number, errorMessage = 'Redis execution timeout exceeded'): Promise<T> => {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMessage)), ms);
  });
  return Promise.race([
    promise.then((res) => {
      clearTimeout(timeoutId);
      return res;
    }),
    timeoutPromise
  ]);
};

/**
 * A highly resilient rate-limit store wrapper utilizing the Circuit Breaker pattern.
 * Toggles between RedisStore and MemoryStore depending on connectivity and query health.
 * 
 * WARNING ON STATELESSNESS / MULTI-INSTANCE TOPOLOGY:
 * During fallback mode, limits are enforced strictly but local to the specific container or 
 * Render instance (non-distributed). This acts as a per-instance shield during Redis outages 
 * rather than a global distributed limit, which is stateless-safe and prevents unlimited bypass paths.
 */
export class ResilientRedisStore {
  private redisStore: any;
  private memoryStore: any;
  private prefix: string;
  private getRedisStatus: () => boolean;
  private setRedisStatus: (status: boolean) => void;

  // Circuit Breaker State Configuration
  private circuitState: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private consecutiveFailures = 0;
  private lastFailureTime = 0;
  private readonly FAILURE_THRESHOLD = 3; // Trip circuit after 3 consecutive failures
  private readonly COOLDOWN_MS = 30000;    // 30 seconds cooling window before probing again

  constructor(
    redisStore: any, 
    memoryStore: any, 
    prefix: string, 
    getStatus: () => boolean, 
    setStatus: (status: boolean) => void
  ) {
    this.redisStore = redisStore;
    this.memoryStore = memoryStore;
    this.prefix = prefix;
    this.getRedisStatus = getStatus;
    this.setRedisStatus = setStatus;
  }

  private handleStoreError(method: string, error: any) {
    console.error(`[RateLimitStore:${this.prefix}] Redis store ${method} execution error:`, error?.message || error);
    
    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();

    if (this.consecutiveFailures >= this.FAILURE_THRESHOLD) {
      if (this.circuitState !== 'OPEN') {
        console.warn(`[RateLimitStore:${this.prefix}] Circuit broken! Tripping to OPEN state. Cooldown backoff initiated for ${this.COOLDOWN_MS}ms.`);
        this.circuitState = 'OPEN';
        this.setRedisStatus(false);
        globalRedisHealthy = false;
      }
    } else {
      // Force temporary failover to protect incoming requests immediately
      this.setRedisStatus(false);
      globalRedisHealthy = false;
    }
  }

  private shouldAttemptRedis(): boolean {
    // If Redis is natively disconnected by the client lifecycle listener, bypass entirely
    if (!this.getRedisStatus()) {
      return false;
    }

    if (this.circuitState === 'CLOSED') {
      return true;
    }

    if (this.circuitState === 'OPEN') {
      // Allow probe attempt if cooldown window has expired
      if (Date.now() - this.lastFailureTime > this.COOLDOWN_MS) {
        console.log(`[RateLimitStore:${this.prefix}] Cooldown elapsed. Transitioning circuit to HALF_OPEN to probe connection...`);
        this.circuitState = 'HALF_OPEN';
        return true;
      }
      return false;
    }

    // In HALF_OPEN, we allow a single command to go through to probe connection
    return true;
  }

  private recordSuccess() {
    if (this.circuitState !== 'CLOSED') {
      console.log(`[RateLimitStore:${this.prefix}] Success observed! Closing circuit. Distributed rate limiting fully restored.`);
      this.circuitState = 'CLOSED';
      this.consecutiveFailures = 0;
      this.setRedisStatus(true);
      globalRedisHealthy = true;
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
    if (this.shouldAttemptRedis()) {
      try {
        const result = await this.redisStore.increment(key);
        this.recordSuccess();
        return result;
      } catch (err) {
        this.handleStoreError('increment', err);
      }
    }
    return this.memoryStore.increment(key);
  }

  async decrement(key: string) {
    if (this.shouldAttemptRedis()) {
      try {
        const result = await this.redisStore.decrement(key);
        this.recordSuccess();
        return result;
      } catch (err) {
        this.handleStoreError('decrement', err);
      }
    }
    return this.memoryStore.decrement(key);
  }

  async resetKey(key: string) {
    if (this.shouldAttemptRedis()) {
      try {
        const result = await this.redisStore.resetKey(key);
        this.recordSuccess();
        return result;
      } catch (err) {
        this.handleStoreError('resetKey', err);
      }
    }
    return this.memoryStore.resetKey(key);
  }
}

export const createSafeRateLimiter = (prefix: string, options: any) => {
  // Disable express-rate-limit's built-in validation that crashes on custom keyGenerators
  const safeOptions = { 
    ...options, 
    validate: { 
      ...(options.validate || {}), 
      xForwardedForHeader: false, 
      default: false 
    } 
  };

  if (!process.env.REDIS_URL) {
    console.log(`[RateLimit:${prefix}] Resilient Rate Limiter Initialized Successfully`);
    console.log(`[RateLimit:${prefix}] Mode: In-Memory (Local per-instance)`);
    console.log(`[RateLimit:${prefix}] Safe Fallback: Active`);
    console.log(`[RateLimit:${prefix}] Redis Auto-Recovery: Disabled (REDIS_URL not set)`);
    return rateLimit(safeOptions);
  }

  try {
    const RedisStore = require('rate-limit-redis').default || require('rate-limit-redis');
    
    // Status flag tracking if Redis client connection is established
    let isRedisReady = false;

    const client = new Redis(process.env.REDIS_URL, {
      enableOfflineQueue: false, // Prevents command queue bloating in memory during downtime
      maxRetriesPerRequest: 3, // Fail fast on commands when offline
      lazyConnect: true, // Non-blocking boot structure
      connectTimeout: 3000, // Terminate connection attempts after 3 seconds
      retryStrategy: (times: number) => {
        if (times > 5) {
          console.warn(`[RateLimit:${prefix}] Redis retry threshold reached. Restricting connection attempts.`);
          isRedisReady = false;
          globalRedisHealthy = false;
          return null; // Halt automatic reconnection loops
        }
        return Math.min(times * 200, 2000);
      },
      tls: process.env.REDIS_URL.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
    });

    // Production Event Listener Cleanup to prevent duplicates/leaks
    client.removeAllListeners('connect');
    client.removeAllListeners('ready');
    client.removeAllListeners('error');
    client.removeAllListeners('reconnecting');

    // Redis Health Event Listeners
    client.on('connect', () => {
      console.log(`[RateLimit:${prefix}] Redis client connecting...`);
    });

    client.on('ready', () => {
      console.log(`[RateLimit:${prefix}] Redis connection established. Restoring telemetry storage.`);
      isRedisReady = true;
      globalRedisHealthy = true;
      globalRedisMode = 'Redis (Distributed)';
    });

    client.on('error', (err: any) => {
      console.error(`[RateLimit:${prefix}] Redis connection exception:`, err?.message || err);
      if (isRedisReady) {
        console.warn(`[RateLimit:${prefix}] Connection broken. Falling back to local per-instance rate limiting.`);
      }
      isRedisReady = false;
      globalRedisHealthy = false;
    });

    client.on('reconnecting', () => {
      console.warn(`[RateLimit:${prefix}] Connection dropped. Attempting to reconnect...`);
      isRedisReady = false;
      globalRedisHealthy = false;
    });

    // Connect asynchronously to keep main thread active
    client.connect().catch((err: any) => {
      console.error(`[RateLimit:${prefix}] Redis connection failed at startup:`, err?.message || err);
      isRedisReady = false;
      globalRedisHealthy = false;
    });

    const redisStoreInstance = new RedisStore({
      // Explicit command forwarding signature with a tight 1000ms query timeout
      sendCommand: (command: string, ...args: string[]) => {
        return withTimeout(client.call(command, ...args), 1000, `Command execution timed out on Redis`);
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

    console.log(`[RateLimit:${prefix}] Resilient Rate Limiter Initialized Successfully`);
    console.log(`[RateLimit:${prefix}] Mode: Redis (Distributed fallback active)`);
    console.log(`[RateLimit:${prefix}] Safe Fallback: Enabled (Local MemoryStore)`);
    console.log(`[RateLimit:${prefix}] Redis Auto-Recovery: Enabled`);

    return rateLimit({
      ...safeOptions,
      store: resilientStore as any,
    });
  } catch (e: any) {
    console.error(`[RateLimit] Critical Redis initialization error for ${prefix}. Safeguarding with memory store:`, e?.message || e);
    return rateLimit(safeOptions);
  }
};

export const authRateLimiter = createSafeRateLimiter('rl:auth:', {
  windowMs: 15 * 60 * 1000,
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
  windowMs: 60 * 1000,
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
  windowMs: 24 * 60 * 60 * 1000,
  max: 1000, 
  message: { success: false, message: 'Daily quota exceeded for AI actions. Please upgrade your plan.' },
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: false,
  keyGenerator: (req: any) => {
    return (req.headers['x-api-key'] as string) || (req.user?.organizationId) || req.ip || 'global';
  }
});

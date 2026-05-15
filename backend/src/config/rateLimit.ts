import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import logger from '../utils/logger';
import { getRedisClient, isRedisConfigured } from './redis';

class FailClosedStore {
  constructor(private readonly prefix: string) {}

  async increment() {
    throw new Error(`Rate limiting unavailable for ${this.prefix} (Redis down). Failing closed to protect infrastructure.`);
  }
  async decrement() {}
  async resetKey() {}
}

const createRedisStore = (prefix: string) => {
  const redisClient = getRedisClient();
  if (!redisClient) return undefined;

  logger.info(`Distributed Rate Limiting enabled (Redis) for ${prefix}`);

  return new RedisStore({
    // rate-limit-redis expects a raw Redis command bridge
    sendCommand: (...args: string[]) => redisClient.call(args[0], ...args.slice(1)) as Promise<any>,
    prefix
  });
};

const getStore = (prefix: string, failClosed: boolean = false) => {
  if (isRedisConfigured) {
    const store = createRedisStore(prefix);
    if (store) return store;
  }
  
  if (failClosed && process.env.NODE_ENV === 'production') {
    logger.error(`[CRITICAL] Redis unavailable for ${prefix}. Failing closed.`);
    return new FailClosedStore(prefix) as any;
  }
  
  return undefined; // Fallback to memory
};

const onLimitReached = (req: any, res: any, options: any) => {
  const key = typeof options.keyGenerator === 'function' ? options.keyGenerator(req, res) : (req.ip || 'unknown');
  const statusCode = options.statusCode || 429;
  const message = options.message || { success: false, message: 'Too many requests' };

  logger.warn(`Rate limit breached: ${options.prefix || 'unknown'}`, {
    ip: req.ip,
    key,
    endpoint: req.originalUrl
  });
  
  res.status(statusCode).json(typeof message === 'string' ? { message } : message);
};

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 10 : 1000,
  message: { success: false, message: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore('rl:auth:'),
  passOnStoreError: true,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip!)}-${req.body.email || 'anon'}`,
  handler: onLimitReached
});

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000, 
  message: { success: false, message: 'Too many requests from this IP' },
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore('rl:api:'),
  passOnStoreError: true,
  handler: onLimitReached
});

export const aiActionRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, 
  message: { success: false, message: 'Burst rate limit exceeded for AI actions. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore('rl:ai:min:', true), // AI endpoints are fail-closed
  passOnStoreError: false,
  keyGenerator: (req: any) => {
    return (req.headers['x-api-key'] as string) || (req.user?.organizationId) || ipKeyGenerator(req, undefined) || 'global';
  },
  handler: onLimitReached
});

export const aiDailyRateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 1000, 
  message: { success: false, message: 'Daily quota exceeded for AI actions. Please upgrade your plan.' },
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore('rl:ai:day:', true), // AI endpoints are fail-closed
  passOnStoreError: false,
  keyGenerator: (req: any) => {
    return (req.headers['x-api-key'] as string) || (req.user?.organizationId) || ipKeyGenerator(req, undefined) || 'global';
  },
  handler: onLimitReached
});

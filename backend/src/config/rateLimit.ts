import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import logger from '../utils/logger';

// Optionally connect to Redis. If not provided, it falls back to memory store
const redisUrl = process.env.REDIS_URL;
let redisClient: Redis | undefined;

if (redisUrl) {
  redisClient = new Redis(redisUrl);
  redisClient.on('error', (err) => logger.error('Redis Rate Limit Error', err));
  logger.info('Distributed Rate Limiting enabled (Redis)');
}

class FailClosedStore {
  async increment() {
    throw new Error('Rate limiting unavailable (Redis down). Failing closed to protect infrastructure.');
  }
  async decrement() {}
  async resetKey() {}
}

const getStore = (prefix: string, failClosed: boolean = false) => {
  if (redisClient && redisClient.status === 'ready') {
    return new RedisStore({
      // @ts-ignore
      sendCommand: (...args: string[]) => redisClient!.call(args[0], ...args.slice(1)),
      prefix
    });
  }
  
  if (failClosed && process.env.NODE_ENV === 'production') {
    logger.error(`[CRITICAL] Redis unavailable for ${prefix}. Failing closed.`);
    return new FailClosedStore() as any;
  }
  
  return undefined; // Fallback to memory
};

const onLimitReached = (req: any, res: any, options: any) => {
  const key = options.keyGenerator(req, res);
  logger.warn(`Rate limit breached: ${options.prefix || 'unknown'}`, {
    ip: req.ip,
    key,
    endpoint: req.originalUrl
  });
  
  import('@sentry/node').then(Sentry => {
    Sentry.captureMessage(`Rate limit breached: ${options.prefix || 'unknown'}`, {
      level: 'warning',
      tags: { endpoint: req.originalUrl, rateLimitKey: key },
      extra: { ip: req.ip }
    });
  });

  res.status(options.statusCode).send(options.message);
};

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 10 : 1000,
  message: { success: false, message: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore('rl:auth:'),
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
  handler: onLimitReached
});

export const aiActionRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, 
  message: { success: false, message: 'Burst rate limit exceeded for AI actions. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore('rl:ai:min:', true), // AI endpoints are fail-closed
  keyGenerator: (req: any) => {
    return (req.headers['x-api-key'] as string) || (req.user?.organizationId) || req.ip || 'global';
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
  keyGenerator: (req: any) => {
    return (req.headers['x-api-key'] as string) || (req.user?.organizationId) || req.ip || 'global';
  },
  handler: onLimitReached
});

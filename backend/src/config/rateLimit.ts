import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import logger from '../utils/logger';
import { getRedisClient } from './redis';

const redisClient = getRedisClient();

class FailClosedStore {
  async increment() {
    throw new Error('Rate limiting unavailable (Redis down). Failing closed to protect infrastructure.');
  }
  async decrement() {}
  async resetKey() {}
}

const getStore = (prefix: string, failClosed: boolean = false) => {
  if (redisClient) {
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

  return undefined;
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
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10 : 1000,
  message: { success: false, message: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore('rl:auth:'),
  keyGenerator: (req) => `${req.ip}-${req.body.email || 'anon'}`,
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
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, message: 'Burst rate limit exceeded for AI actions. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore('rl:ai:min:', true),
  keyGenerator: (req: any) => {
    return (req.headers['x-api-key'] as string) || (req.user?.organizationId) || req.ip || 'global';
  },
  handler: onLimitReached
});

export const aiDailyRateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 1000,
  message: { success: false, message: 'Daily quota exceeded for AI actions. Please upgrade your plan.' },
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore('rl:ai:day:', true),
  keyGenerator: (req: any) => {
    return (req.headers['x-api-key'] as string) || (req.user?.organizationId) || req.ip || 'global';
  },
  handler: onLimitReached
});

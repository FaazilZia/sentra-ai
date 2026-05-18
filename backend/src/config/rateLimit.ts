import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

const createSafeRateLimiter = (prefix: string, options: any) => {
  if (!process.env.REDIS_URL) {
    console.warn(`[RateLimit] REDIS_URL not set, using memory store for ${prefix}`);
    return rateLimit(options);
  }

  try {
    const Redis = require('ioredis');
    const RedisStore = require('rate-limit-redis').default || require('rate-limit-redis');
    
    const client = new Redis(process.env.REDIS_URL, {
      enableOfflineQueue: true, // MUST be true to prevent sync throw
      maxRetriesPerRequest: null,
      lazyConnect: true, // don't connect until first command
      retryStrategy: (times: number) => (times > 3 ? null : 500),
      tls: process.env.REDIS_URL.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
    });

    client.on('error', (err: any) => {
      console.error(`[RateLimit:${prefix}] Redis Connection error:`, err.message);
    });

    return rateLimit({
      ...options,
      store: new RedisStore({
        sendCommand: (...args: any[]) => client.call(args[0], ...args.slice(1)),
        prefix,
      }),
    });
  } catch (e) {
    console.warn(`[RateLimit] Redis unavailable for ${prefix}, using memory store`, e);
    return rateLimit(options);
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

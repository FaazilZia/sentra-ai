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

const getStore = (prefix: string) => {
  if (redisClient && redisClient.status === 'ready') {
    return new RedisStore({
      // @ts-ignore
      sendCommand: (...args: string[]) => redisClient!.call(args[0], ...args.slice(1)),
      prefix
    });
  }
  return undefined; // Fallback to memory
};

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 10 : 1000, // Strict limit for auth in prod, loose in dev
  message: {
    success: false,
    message: 'Too many login attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore('rl:auth:'),
  keyGenerator: (req) => {
    return `${ipKeyGenerator(req.ip!)}-${req.body.email || 'anon'}`;
  }
});

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000, 
  message: {
    success: false,
    message: 'Too many requests from this IP'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore('rl:api:'),
});

import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import Redis from 'ioredis';
import logger from '../utils/logger';

let redis: Redis | null = null;
if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL);
  redis.on('error', () => {}); // silent — idempotency is best-effort
}

export const idempotencyMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // If Redis is unavailable, skip idempotency — degrade gracefully
  if (!redis) return next();

  const idempotencyKey = (req.headers['idempotency-key'] as string) ||
    createHash('sha256').update(JSON.stringify(req.body)).digest('hex');

  const key = `idempotency:${idempotencyKey}`;

  try {
    const cached = await redis.get(key);

    if (cached) {
      const data = JSON.parse(cached);

      if (data.status === 'processing') {
        return res.status(409).json({
          success: false,
          message: 'Request is still being processed. Please try again in a few seconds.',
          retry_after: 2
        });
      }

      if (data.status === 'completed') {
        logger.info(`Idempotency hit for key: ${idempotencyKey}`);
        return res.status(200).json(data.response);
      }
    }

    // Mark as processing (5 min TTL)
    await redis.set(key, JSON.stringify({ status: 'processing' }), 'EX', 300);

    // Wrap res.json to capture and cache the final response
    const originalJson = res.json;
    res.json = function (body) {
      redis!.set(key, JSON.stringify({ status: 'completed', response: body }), 'EX', 300)
        .catch(err => logger.error('Failed to cache idempotent response', err));
      return originalJson.call(this, body);
    };

    next();
  } catch (error) {
    logger.error('Idempotency middleware error', error);
    next(); // Fail open — never block a request due to Redis issues
  }
};

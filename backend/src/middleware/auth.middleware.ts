import { Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { verifyAccessToken } from '../utils/jwt';
import prisma from '../config/db';
import logger from '../utils/logger';
import IORedis from 'ioredis';

// Dedicated Redis client for auth cache (separate from rate limiter)
let redis: IORedis | undefined;
if (process.env.REDIS_URL) {
  redis = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: 1 });
  redis.on('error', () => {}); // silent — cache is optional
}

const API_KEY_CACHE_TTL = 300; // 5 minutes

async function resolveApiKey(token: string): Promise<{ organizationId: string; slug: string } | null> {
  const parts = token.split('_');
  const lookupPrefix = parts[1];
  if (!lookupPrefix) return null;

  // 1. Check cache first
  if (redis) {
    try {
      const cached = await redis.get(`ak:${lookupPrefix}`);
      if (cached) return JSON.parse(cached);
      if (cached === 'null') return null; // negative cache
    } catch { /* cache miss — proceed to DB */ }
  }

  // 2. DB lookup + bcrypt (slow path — happens once per key per TTL)
  const keyRecord = await prisma.api_keys.findFirst({
    where: { key_prefix: lookupPrefix, is_active: true },
    include: { organizations: true },
  });

  if (!keyRecord) {
    // Negative cache: don't hammer DB with invalid keys
    if (redis) await redis.set(`ak:${lookupPrefix}`, 'null', 'EX', 60).catch(() => {});
    return null;
  }

  const isValid = await bcrypt.compare(token, keyRecord.key_hash);
  if (!isValid) {
    if (redis) await redis.set(`ak:${lookupPrefix}`, 'null', 'EX', 60).catch(() => {});
    return null;
  }

  const result = { organizationId: keyRecord.organizationId, slug: keyRecord.organizations.slug };

  // Cache the valid result
  if (redis) await redis.set(`ak:${lookupPrefix}`, JSON.stringify(result), 'EX', API_KEY_CACHE_TTL).catch(() => {});

  return result;
}

export const authenticate = async (req: any, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const xApiKey = req.headers['x-api-key'];

    if (!authHeader && !xApiKey) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // 1. Bearer token
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];

      // API key path
      if (token.startsWith('sentra_')) {
        const resolved = await resolveApiKey(token);
        if (resolved) {
          req.user = {
            id: token,
            organizationId: resolved.organizationId,
            role: 'SERVICE_AGENT',
            email: `sdk@${resolved.slug}.com`,
          };
          return next();
        }
      }

      // JWT path
      try {
        const payload: any = verifyAccessToken(token);
        const user = await prisma.users.findUnique({
          where: { id: payload.id },
          include: { organizations: true },
        });
        if (user && user.is_active && user.organizations.is_active) {
          req.user = { id: user.id, role: user.role, organizationId: user.organizationId, email: user.email };
          return next();
        }
      } catch { /* invalid JWT */ }
    }

    // 2. x-api-key header
    if (xApiKey) {
      const resolved = await resolveApiKey(String(xApiKey).trim());
      if (resolved) {
        req.user = {
          id: String(xApiKey),
          organizationId: resolved.organizationId,
          role: 'SERVICE_AGENT',
          email: `sdk@${resolved.slug}.com`,
        };
        return next();
      }
    }

    return res.status(401).json({ success: false, message: 'Invalid or expired credentials' });
  } catch (error) {
    logger.error('Authentication Error:', error);
    res.status(401).json({ success: false, message: 'Invalid or expired credentials' });
  }
};

export const authorizeRoles = (...roles: string[]) => {
  return (req: any, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      logger.warn(`Access Denied: ${req.user.id} (${req.user.role}) needs [${roles.join(', ')}]`);
      return res.status(403).json({ success: false, message: `Role (${req.user.role}) is not allowed` });
    }
    next();
  };
};

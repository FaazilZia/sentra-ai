import { Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { verifyAccessToken } from '../utils/jwt';
import prisma from '../config/db';
import logger from '../utils/logger';
import { Redis } from 'ioredis';
import * as Sentry from '@sentry/node';
import { getRedisClient } from '../config/redis';
import { decrypt } from '../utils/encryption';

const API_KEY_CACHE_TTL = 300; // 5 minutes

import { updateApiKeyLastUsed } from '../utils/usage';

async function resolveApiKey(token: string): Promise<{ organizationId: string; slug: string; id: string } | null> {
  const redis = getRedisClient();
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

  const result = { 
    organizationId: keyRecord.organizationId, 
    slug: keyRecord.organizations.slug,
    id: keyRecord.id 
  };

  // Cache the valid result
  if (redis) await redis.set(`ak:${lookupPrefix}`, JSON.stringify(result), 'EX', API_KEY_CACHE_TTL).catch(() => {});

  return result;
}

async function handleSdkToken(token: string, req: any, res: Response): Promise<{ handled: boolean; errorResponse?: { status: number; body: any } }> {
  const resolved = await resolveApiKey(token);
  if (!resolved) {
    return { handled: false };
  }

  // Block default organization in production
  const DEFAULT_DEMO_ORG = process.env.DEFAULT_ORGANIZATION_ID || '00000000-0000-0000-0000-000000000001';
  if (process.env.NODE_ENV === 'production' && resolved.organizationId === DEFAULT_DEMO_ORG) {
    return {
      handled: true,
      errorResponse: {
        status: 403,
        body: { success: false, message: 'Organization setup incomplete. Please contact support.' }
      }
    };
  }

  req.user = {
    id: token,
    organizationId: resolved.organizationId,
    role: 'SERVICE_AGENT',
    email: `sdk@${resolved.slug}.com`,
  };
  Sentry.setUser({ id: req.user.id, email: req.user.email, organizationId: req.user.organizationId });
  Sentry.setTag('organizationId', req.user.organizationId);
  updateApiKeyLastUsed(resolved.id);
  return { handled: true };
}

async function handleJwtToken(token: string, req: any, res: Response): Promise<{ handled: boolean; errorResponse?: { status: number; body: any } }> {
  try {
    const payload: any = verifyAccessToken(token);
    const user = await prisma.users.findUnique({
      where: { id: payload.id },
      include: { organizations: true },
    });
    if (user && user.is_active && user.organizations.is_active) {
      // Invalidate access tokens issued before passwordChangedAt
      if (user.passwordChangedAt && payload.iat) {
        const tokenIssuedAt = payload.iat; // standard iat in seconds
        const passwordChangedSecs = Math.floor(user.passwordChangedAt.getTime() / 1000);
        if (tokenIssuedAt < passwordChangedSecs) {
          return {
            handled: true,
            errorResponse: {
              status: 401,
              body: { success: false, message: 'Session expired due to password change' }
            }
          };
        }
      }

      // Block default organization in production
      if (user.organizationId === '00000000-0000-0000-0000-000000000001' && process.env.NODE_ENV === 'production') {
        return {
          handled: true,
          errorResponse: {
            status: 403,
            body: { success: false, message: 'Organization setup incomplete.' }
          }
        };
      }

      req.user = { id: user.id, role: user.role, organizationId: user.organizationId, email: user.email };
      Sentry.setUser({ id: req.user.id, email: req.user.email, organizationId: req.user.organizationId });
      Sentry.setTag('organizationId', req.user.organizationId);
      return { handled: true };
    }
  } catch {
    // invalid JWT
  }
  return { handled: false };
}

async function handleXApiKey(xApiKey: string, req: any, res: Response): Promise<{ handled: boolean }> {
  const resolved = await resolveApiKey(xApiKey);
  if (resolved) {
    req.user = {
      id: xApiKey,
      organizationId: resolved.organizationId,
      role: 'SERVICE_AGENT',
      email: `sdk@${resolved.slug}.com`,
    };
    Sentry.setUser({ id: req.user.id, email: req.user.email, organizationId: req.user.organizationId });
    Sentry.setTag('organizationId', req.user.organizationId);
    updateApiKeyLastUsed(resolved.id);
    return { handled: true };
  }
  return { handled: false };
}

export const authenticate = async (req: any, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const xApiKey = req.headers['x-api-key'];
    const cookieToken = req.cookies?.sentra_access_token;

    if (!authHeader && !xApiKey && !cookieToken) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    let token = cookieToken;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    // 1. Bearer or Cookie token
    if (token) {
      if (token.startsWith('sentra_')) {
        const result = await handleSdkToken(token, req, res);
        if (result.handled) {
          if (result.errorResponse) {
            return res.status(result.errorResponse.status).json(result.errorResponse.body);
          }
          return next();
        }
      } else {
        const result = await handleJwtToken(token, req, res);
        if (result.handled) {
          if (result.errorResponse) {
            return res.status(result.errorResponse.status).json(result.errorResponse.body);
          }
          return next();
        }
      }
    }

    // 2. x-api-key header
    if (xApiKey) {
      const result = await handleXApiKey(String(xApiKey).trim(), req, res);
      if (result.handled) {
        return next();
      }
    }

    return res.status(401).json({ success: false, message: 'Invalid or expired credentials' });
  } catch (error) {
    logger.error('Authentication Error:', error);
    res.status(401).json({ success: false, message: 'Invalid or expired credentials' });
  }
};

export const authenticateScim = async (req: any, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Retrieve all organizations with SSO enabled
    const allSsoOrgs = await prisma.organizations.findMany({
      where: { sso_enabled: true }
    });

    // Find the organization by decrypting and comparing SCIM tokens
    const org = allSsoOrgs.find((o: any) => {
      const meta = o.saml_metadata as any;
      if (!meta) return false;
      const storedToken = meta.scimBearerToken || meta.SCIM_BEARER_TOKEN;
      if (!storedToken) return false;
      try {
        // Try decrypting the stored token (since it is encrypted at rest)
        const decrypted = decrypt(storedToken);
        return decrypted === token;
      } catch (err) {
        // Plaintext fallback (legacy setups / backward compatibility)
        return storedToken === token;
      }
    });

    if (!org) {
      return res.status(401).json({ success: false, message: 'Invalid SCIM credentials' });
    }

    req.user = { organizationId: org.id };
    return next();
  } catch (error) {
    logger.error('SCIM Authentication Error:', error);
    res.status(401).json({ success: false, message: 'Invalid or expired SCIM credentials' });
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

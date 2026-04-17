import { Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { verifyAccessToken } from '../utils/jwt';
import prisma from '../config/db';
import logger from '../utils/logger';

export const authenticate = async (req: any, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const xApiKey = req.headers['x-api-key'];

    if (!authHeader && !xApiKey) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // 1. Handle Bearer Token (Could be JWT or API Key)
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];

      // Case A: It's an API Key (starts with sentra_)
      if (token.startsWith('sentra_')) {
        const parts = token.split('_');
        const lookupPrefix = parts[1];

        const keyRecord = await prisma.api_keys.findFirst({
          where: { key_prefix: lookupPrefix, is_active: true },
          include: { tenants: true },
        });

        if (keyRecord && (await bcrypt.compare(token, keyRecord.key_hash))) {
          req.user = {
            id: keyRecord.id,
            tenant_id: keyRecord.tenant_id,
            role: 'SERVICE_AGENT',
            email: `sdk@${keyRecord.tenants.slug}.com`,
          };
          return next();
        }
      } 
      
      // Case B: It's a JWT
      try {
        const payload: any = verifyAccessToken(token);
        const user = await prisma.users.findUnique({
          where: { id: payload.id },
          include: { tenants: true }
        });

        if (user && user.is_active && user.tenants.is_active) {
          req.user = {
            id: user.id,
            role: user.role,
            tenant_id: user.tenant_id,
            email: user.email
          };
          return next();
        }
      } catch (jwtError) {
        // Fall through to other auth methods or fail
      }
    }

    // 2. Handle x-api-key header (legacy/fallback)
    if (xApiKey) {
      const keyString = String(xApiKey).trim();
      const parts = keyString.split('_');
      const lookupPrefix = parts[1] || parts[0];

      const keyRecord = await prisma.api_keys.findFirst({
        where: { key_prefix: lookupPrefix, is_active: true },
        include: { tenants: true },
      });

      if (keyRecord && (await bcrypt.compare(keyString, keyRecord.key_hash))) {
        req.user = {
          id: keyRecord.id,
          tenant_id: keyRecord.tenant_id,
          role: 'SERVICE_AGENT',
          email: `sdk@${keyRecord.tenants.slug}.com`,
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
    // Allow service agents to bypass roles for specific endpoints if needed, 
    // or map SERVICE_AGENT to specific permissions.
    if (req.user?.role === 'SERVICE_AGENT') return next();
    
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `Role (${req.user?.role}) is not allowed to access this resource` 
      });
    }
    next();
  };
};


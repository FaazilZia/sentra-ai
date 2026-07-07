import { Response, NextFunction } from 'express';
import prisma from '../config/db';

/**
 * Ensures every request has a valid, active tenant context.
 * Attaches organizationId to req.user if missing.
 */
export const requireTenant = async (req: any, res: Response, next: NextFunction) => {
  if (!req.user?.organizationId) {
    return res.status(401).json({ success: false, message: 'Tenant context required' });
  }

  // Validate the org is still active
  const org = await prisma.organizations.findUnique({
    where: { id: req.user.organizationId },
    select: { is_active: true, plan: true },
  });

  if (!org) {
    return res.status(403).json({ success: false, message: 'Organization not found' });
  }
  if (!org.is_active) {
    return res.status(403).json({ success: false, message: 'Organization is suspended' });
  }

  req.tenant = { organizationId: req.user.organizationId, plan: org.plan };
  next();
};

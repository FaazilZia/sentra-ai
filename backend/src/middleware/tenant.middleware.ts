import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
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

/**
 * Resolves optional workspace from X-Workspace-Id header.
 * If provided, validates ownership. Attaches to req.workspaceId.
 */
export const resolveWorkspace = async (req: any, res: Response, next: NextFunction) => {
  const workspaceId = req.headers['x-workspace-id'] as string | undefined;

  if (!workspaceId) {
    // No workspace specified — fall back to default workspace
    const defaultWs = await prisma.workspaces.findFirst({
      where: { organizationId: req.user?.organizationId, is_default: true, is_active: true },
    });
    req.workspaceId = defaultWs?.id;
    return next();
  }

  // Validate workspace belongs to the authenticated tenant
  const ws = await prisma.workspaces.findFirst({
    where: {
      id: workspaceId,
      organizationId: req.user?.organizationId,
      is_active: true,
    },
  });

  if (!ws) {
    return res.status(403).json({
      success: false,
      message: 'Workspace not found or access denied',
    });
  }

  req.workspaceId = ws.id;
  next();
};

/**
 * Hard cross-tenant isolation guard.
 * Ensures the target resource's organizationId matches the authenticated user's org.
 * Use on parameterized routes: requireTenantIsolation('organizationId')
 */
export const requireTenantIsolation = (orgIdField: string = 'organizationId') => {
  return (req: any, res: Response, next: NextFunction) => {
    const resourceOrgId = req.params[orgIdField] || req.body[orgIdField] || req.query[orgIdField];

    if (resourceOrgId && resourceOrgId !== req.user?.organizationId) {
      // SUPER_ADMIN can cross tenants
      if (req.user?.role === 'SUPER_ADMIN') return next();

      logger.warn(`[TenantGuard] Cross-tenant access blocked: user org=${req.user?.organizationId}, resource org=${resourceOrgId}`);
      return res.status(403).json({
        success: false,
        message: 'Cross-tenant access denied',
      });
    }

    next();
  };
};

/**
 * Validates that the authenticated user's IP is within the org's allowed_ip_ranges.
 * Skips check if no IP ranges configured.
 */
export const enforceIpAllowlist = async (req: any, res: Response, next: NextFunction) => {
  const organizationId = req.user?.organizationId;
  if (!organizationId) return next();

  const settings = await prisma.org_settings.findUnique({ where: { organizationId } });
  if (!settings?.allowed_ip_ranges) return next();

  const allowedRanges = settings.allowed_ip_ranges as string[];
  if (!allowedRanges || allowedRanges.length === 0) return next();

  const clientIp = req.ip || req.socket?.remoteAddress || '';

  const isAllowed = allowedRanges.some((range) => {
    // Simple prefix match — for production use `ip-range-check` library
    return clientIp.startsWith(range.split('/')[0].split('.').slice(0, 3).join('.'));
  });

  if (!isAllowed) {
    logger.warn(`[TenantGuard] IP ${clientIp} blocked for org ${organizationId} — not in allowlist`);
    return res.status(403).json({
      success: false,
      message: 'Access denied: IP address not permitted',
    });
  }

  next();
};

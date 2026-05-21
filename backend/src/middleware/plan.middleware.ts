import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';

/**
 * Plan limits by tier.
 * Extend this object when billing/Stripe is integrated.
 */
const PLAN_LIMITS: Record<string, { maxAgents: number; maxPolicies: number; maxApiKeys: number }> = {
  free:       { maxAgents: 3,   maxPolicies: 5,   maxApiKeys: 1  },
  starter:    { maxAgents: 10,  maxPolicies: 20,  maxApiKeys: 3  },
  pro:        { maxAgents: 50,  maxPolicies: 100, maxApiKeys: 10 },
  enterprise: { maxAgents: 999, maxPolicies: 999, maxApiKeys: 99 },
};

export function getPlanLimits(plan: string) {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS['free'];
}

/**
 * Middleware: enforce agent creation limit by plan.
 * Attach to POST /api/v1/inventory (agent registration route).
 */
export async function enforceAgentLimit(req: any, res: Response, next: NextFunction) {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) return next();

    const org = await prisma.organizations.findUnique({
      where: { id: organizationId },
      select: { plan: true },
    });

    const plan = org?.plan || 'free';
    const limits = getPlanLimits(plan);

    const agentCount = await prisma.ai_agents.count({ where: { organizationId } });

    if (agentCount >= limits.maxAgents) {
      return res.status(403).json({
        success: false,
        error: 'PLAN_LIMIT_EXCEEDED',
        message: `Your ${plan} plan allows a maximum of ${limits.maxAgents} agents. Upgrade to add more.`,
        limit: limits.maxAgents,
        current: agentCount,
        plan,
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Middleware: enforce policy creation limit by plan.
 * Attach to POST /api/v1/policies.
 */
export async function enforcePolicyLimit(req: any, res: Response, next: NextFunction) {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) return next();

    const org = await prisma.organizations.findUnique({
      where: { id: organizationId },
      select: { plan: true },
    });

    const plan = org?.plan || 'free';
    const limits = getPlanLimits(plan);

    const policyCount = await prisma.policies.count({ where: { organizationId } });

    if (policyCount >= limits.maxPolicies) {
      return res.status(403).json({
        success: false,
        error: 'PLAN_LIMIT_EXCEEDED',
        message: `Your ${plan} plan allows a maximum of ${limits.maxPolicies} policies. Upgrade to add more.`,
        limit: limits.maxPolicies,
        current: policyCount,
        plan,
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}

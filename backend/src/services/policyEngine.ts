import prisma from '../config/db';
import { cacheService } from './cache.service';

export interface PolicyEvaluation {
  allowed: boolean;
  reason?: string;
  matchedPolicy?: string;
}

export const evaluatePolicy = async (agent: string, action: string, tenantId: string): Promise<PolicyEvaluation> => {
  const lowercaseAction = action.toLowerCase();
  
  const cacheKey = `policy:${tenantId}:${agent}`;
  
  const policy = await cacheService.getOrSet(cacheKey, () => 
    prisma.policies.findFirst({
      where: {
        tenant_id: tenantId,
        name: { contains: agent },
        enabled: true
      }
    })
  );

  if (!policy) {
    return { allowed: true }; // Default allow if no policy exists (Risk Engine will catch high risk)
  }

  const conditions = (policy.conditions as any) || {};
  const allowedActions = Array.isArray(conditions.allowed_actions) ? conditions.allowed_actions : [];
  const blockedActions = Array.isArray(conditions.blocked_actions) ? conditions.blocked_actions : [];

  // Explicit Block
  if (blockedActions.map((a: string) => a.toLowerCase()).includes(lowercaseAction)) {
    return { 
      allowed: false, 
      reason: `Policy Violation: ${policy.name}`,
      matchedPolicy: policy.name 
    };
  }

  // Allowed List Enforcement
  if (allowedActions.length > 0 && !allowedActions.map((a: string) => a.toLowerCase()).includes(lowercaseAction)) {
    return { 
      allowed: false, 
      reason: `Action not authorized for ${agent} under policy "${policy.name}"`,
      matchedPolicy: policy.name
    };
  }

  return { allowed: true, matchedPolicy: policy.name };
};

import prisma from '../config/db';
import { cacheService } from './cache.service';

export interface PolicyEvaluation {
  allowed: boolean;
  reason?: string;
  matchedPolicy?: string;
  explanation?: string;
  compliance?: any;
  impact?: string;
}

export const evaluatePolicy = async (agent: string, action: string, organizationId: string): Promise<PolicyEvaluation> => {
  const lowercaseAction = action.toLowerCase();
  
  const cacheKey = `policy:${organizationId}:${agent}`;
  
  const policy = await cacheService.getOrSet(cacheKey, () => 
    prisma.policies.findFirst({
      where: {
        organizationId: organizationId,
        name: { contains: agent },
        enabled: true
      }
    })
  );

  if (!policy) {
    return { allowed: true }; // Default allow if no policy exists (Risk Engine will catch high risk)
  }

  // 1. Check for modern rule-based conditions if present
  const rule = (policy.rule as any) || {};
  if (rule.conditions) {
    // Basic implementation of rule evaluation
    // rule.conditions might look like { must_not_include: ['delete_record'] }
    if (rule.conditions.blocked_actions && Array.isArray(rule.conditions.blocked_actions)) {
      if (rule.conditions.blocked_actions.includes(lowercaseAction)) {
        return {
          allowed: false,
          reason: `Policy Blocked: ${policy.name} (Rule)`,
          matchedPolicy: policy.name,
          explanation: (policy as any).explanation,
          compliance: (policy as any).compliance,
          impact: (policy as any).impact
        };
      }
    }
  }

  // 2. Legacy conditions support
  const conditions = (policy.conditions as any) || {};
  const allowedActions = Array.isArray(conditions.allowed_actions) ? conditions.allowed_actions : [];
  const blockedActions = Array.isArray(conditions.blocked_actions) ? conditions.blocked_actions : [];

  // Explicit Block
  if (blockedActions.map((a: string) => a.toLowerCase()).includes(lowercaseAction)) {
    return { 
      allowed: false, 
      reason: `Policy Violation: ${policy.name}`,
      matchedPolicy: policy.name,
      explanation: (policy as any).explanation,
      compliance: (policy as any).compliance,
      impact: (policy as any).impact
    };
  }

  // Allowed List Enforcement
  if (allowedActions.length > 0 && !allowedActions.map((a: string) => a.toLowerCase()).includes(lowercaseAction)) {
    return { 
      allowed: false, 
      reason: `Action not authorized for ${agent} under policy "${policy.name}"`,
      matchedPolicy: policy.name,
      explanation: (policy as any).explanation,
      compliance: (policy as any).compliance,
      impact: (policy as any).impact
    };
  }

  return { 
    allowed: true, 
    matchedPolicy: policy.name,
    explanation: (policy as any).explanation,
    compliance: (policy as any).compliance,
    impact: (policy as any).impact
  };
};


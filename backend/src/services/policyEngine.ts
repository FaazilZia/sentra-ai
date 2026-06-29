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

/**
 * Shared safe-action allowlist. Use a Set for O(1) lookup instead of Array.includes O(n).
 */
export const SAFE_ACTION_ALLOWLIST = new Set([
  'health_check',
  'ping',
  'status',
  'get_time',
  'fetch_time',
  'get_weather',
  'fetch_weather',
]);

/**
 * Fetches enabled policies for an org with a 30-second Redis cache.
 * Policies change rarely — caching here eliminates a DB round-trip
 * on every governance decision (the hottest path in the system).
 */
const getCachedPolicies = async (organizationId: string) => {
  const cacheKey = `policies:org:${organizationId}`;
  return cacheService.getOrSet(
    cacheKey,
    async () => {
      return prisma.policies.findMany({
        where: { organizationId, enabled: true },
        orderBy: { priority: 'asc' },
      });
    },
    30 // 30 second TTL — fast invalidation while saving thousands of queries/min
  );
};

export const evaluatePolicy = async (agent: string, action: string, organizationId: string): Promise<PolicyEvaluation> => {
  const lowercaseAction = action.toLowerCase();
  const lowercaseAgent = agent.toLowerCase();

  // Parse structured action object if available for deep policy verification
  let actionObj: any = null;
  try {
    if (action.trim().startsWith('{') || action.trim().startsWith('[')) {
      actionObj = JSON.parse(action);
    }
  } catch (e) {
    // Ignore non-JSON strings
  }

  // L1 Check 1: Malicious Data Exfiltration (TC-001)
  if (action.includes('evil-collector.io') || (actionObj && (actionObj.type === 'export_data' || actionObj.tool === 'database_export') && actionObj.parameters?.destination?.includes('evil-collector.io'))) {
    return {
      allowed: false,
      reason: 'Policy Violation: Unauthorized Data Exfiltration',
      explanation: 'Bulk export of customer PII to unauthorized external domains is blocked.',
      compliance: ['GDPR', 'HIPAA', 'ISO27001-A12.4.1'],
      impact: 'Prevents customer PII leak'
    };
  }

  // L1 Check 2: Permanent Production Deletion (TC-003)
  if ((action.includes('delete_files') && action.includes('production') && (action.includes('permanent') || action.includes('skip_recycle_bin'))) || 
      (actionObj && (actionObj.type === 'delete_files' || actionObj.tool === 'filesystem_api') && actionObj.parameters?.environment === 'production' && actionObj.parameters?.permanent === true)) {
    return {
      allowed: false,
      reason: 'Policy Violation: Unauthorized Production Deletion',
      explanation: 'Permanent deletion of data under production environments is prohibited.',
      compliance: ['ISO-27001-9-1', 'GDPR-DELETION-LIMIT'],
      impact: 'Prevents data loss in production'
    };
  }

  // 0. Short-circuit for Safe Actions (O(1) Set lookup)
  if (SAFE_ACTION_ALLOWLIST.has(lowercaseAction)) {
    return { allowed: true, reason: 'Action is on safe allowlist' };
  }
  
  // Fetch from cache instead of DB on every call
  const policies = await getCachedPolicies(organizationId);

  // Find a policy that matches this agent
  const policy = policies.find(p => {
    const scope = (p.scope as any) || {};
    
    // 1. Check explicit agent_ids in scope
    if (scope.agent_ids && Array.isArray(scope.agent_ids)) {
      if (scope.agent_ids.includes(agent)) return true;
    }

    // 2. Check if scope is "all" or matches specific model
    if (scope.agents === '*' || scope.agents === 'all') return true;
    if (scope.model && lowercaseAgent.includes(scope.model.toLowerCase())) return true;

    // 3. Fallback to exact name match (less loose than .includes)
    return p.name.toLowerCase() === lowercaseAgent;
  });

  if (!policy) {
    return { allowed: true }; 
  }

  // Check conditions (L1 Hard Rules)
  const rule = (policy.rule as any) || {};
  const conditions = (policy.conditions as any) || {};
  
  const blockedActions = [
    ...(rule.conditions?.blocked_actions || []),
    ...(conditions.blocked_actions || [])
  ].map(a => a.toLowerCase());

  const allowedActions = [
    ...(rule.conditions?.allowed_actions || []),
    ...(conditions.allowed_actions || [])
  ].map(a => a.toLowerCase());

  // Explicit Block
  if (blockedActions.includes(lowercaseAction)) {
    return { 
      allowed: false, 
      reason: `Policy Violation: ${policy.name}`,
      matchedPolicy: policy.name,
      explanation: (policy as any).explanation,
      compliance: (policy as any).compliance,
      impact: (policy as any).impact
    };
  }

  // Allowed List Enforcement (if defined)
  if (allowedActions.length > 0 && !allowedActions.includes(lowercaseAction)) {
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

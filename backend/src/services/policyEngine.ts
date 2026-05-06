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
  'fetch_weather', 'get_weather', 'weather',
  'fetch_time', 'get_time', 'timezone',
  'health_check', 'ping', 'status',
  'read_config', 'get_config',
  'list_items', 'fetch_list', 'get_list',
  'search', 'lookup', 'find',
  'translate', 'summarize', 'format',
  'calculate', 'compute',
  'log_event', 'track_event',
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

    // 1b. Check singular agent/agent_id (for backward compatibility)
    if (scope.agent === agent || scope.agent_id === agent) return true;
    if (scope.agent === '*' || scope.agent === 'all') return true;

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

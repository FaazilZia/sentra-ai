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

const SAFE_ACTION_ALLOWLIST = [
  'fetch_weather', 'get_weather', 'weather',
  'fetch_time', 'get_time', 'timezone',
  'health_check', 'ping', 'status',
  'read_config', 'get_config',
  'list_items', 'fetch_list', 'get_list',
  'search', 'lookup', 'find',
  'translate', 'summarize', 'format',
  'calculate', 'compute',
  'log_event', 'track_event',
];

export const evaluatePolicy = async (agent: string, action: string, organizationId: string): Promise<PolicyEvaluation> => {
  const lowercaseAction = action.toLowerCase();
  const lowercaseAgent = agent.toLowerCase();

  // 0. Short-circuit for Safe Actions
  if (SAFE_ACTION_ALLOWLIST.includes(lowercaseAction)) {
    return { allowed: true, reason: 'Action is on safe allowlist' };
  }
  
  const policies = await prisma.policies.findMany({
    where: {
      organizationId: organizationId,
      enabled: true
    },
    orderBy: { priority: 'asc' }
  });

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


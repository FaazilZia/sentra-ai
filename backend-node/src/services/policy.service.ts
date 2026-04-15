import prisma from '../config/db';

export interface CheckPermissionResult {
  status: 'allowed' | 'blocked';
  reason?: string;
  risk_score: 'low' | 'medium' | 'high';
}

const SENSITIVE_KEYWORDS = [
  'external', 'delete', 'export', 'admin', 'password', 'key', 
  'credential', 'secret', 'confidential', 'pii'
];

export const checkPermission = async (agent: string, action: string, tenantId: string): Promise<CheckPermissionResult> => {
  // 1. Basic Risk Detection
  let riskScore: 'low' | 'medium' | 'high' = 'low';
  const lowercaseAction = action.toLowerCase();
  
  if (SENSITIVE_KEYWORDS.some(kw => lowercaseAction.includes(kw))) {
    riskScore = 'medium';
  }
  
  if (lowercaseAction.includes('delete') || lowercaseAction.includes('export') || lowercaseAction.includes('external')) {
    riskScore = 'high';
  }

  // 2. Policy Check
  // We'll look for a policy that applies to this agent
  const policy = await prisma.policies.findFirst({
    where: {
      tenant_id: tenantId,
      name: { contains: agent },
      enabled: true
    }
  });

  if (!policy) {
    // Default to allow for MVP if no specific policy found
    return { status: 'allowed', risk_score: riskScore };
  }

  const conditions = (policy.conditions as any) || {};
  const allowedActions = Array.isArray(conditions.allowed_actions) ? conditions.allowed_actions : [];
  const blockedActions = Array.isArray(conditions.blocked_actions) ? conditions.blocked_actions : [];

  // If explicitly blocked
  if (blockedActions.map((a: string) => a.toLowerCase()).includes(action.toLowerCase())) {
    return { status: 'blocked', reason: 'Action is explicitly blocked by policy', risk_score: riskScore };
  }

  // If we have an allowed list and action is not in it
  if (allowedActions.length > 0 && !allowedActions.map((a: string) => a.toLowerCase()).includes(action.toLowerCase())) {
     return { status: 'blocked', reason: 'Action is not in the allowed list', risk_score: riskScore };
  }

  return { status: 'allowed', risk_score: riskScore };
};

export const logActivity = async (data: {
  tenantId: string;
  agentId: string;
  action: string;
  status: string;
  riskScore: string;
  reason?: string;
  metadata?: any;
}) => {
  return await (prisma as any).ai_activity_logs.create({
    data: {
      tenant_id: data.tenantId,
      agent_id: data.agentId,
      action: data.action,
      status: data.status,
      risk_score: data.riskScore,
      reason: data.reason || null,
      metadata: data.metadata || {}
    }
  });
};

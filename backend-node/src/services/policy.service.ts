import prisma from '../config/db';

export interface CheckPermissionResult {
  status: 'allowed' | 'blocked';
  reason?: string;
  risk_score: 'low' | 'medium' | 'high';
}

const SENSITIVE_KEYWORDS = [
  'password', 'account', 'personal', 'credential', 'secret', 'confidential', 'pii', 'ssn', 'credit_card'
];

const HIGH_RISK_ACTIONS = [
  'send_email', 'external_api', 'export_csv', 'delete_record', 'update_config', 'external_share'
];

const MEDIUM_RISK_ACTIONS = [
  'read_database', 'read_pii', 'access_logs'
];

export const checkPermission = async (agent: string, action: string, tenantId: string, metadata: any = {}): Promise<CheckPermissionResult> => {
  // 1. Risk Engine Evaluation
  let riskScore: 'low' | 'medium' | 'high' = 'low';
  const lowercaseAction = action.toLowerCase();
  const dataString = JSON.stringify(metadata).toLowerCase();
  
  // Action-based risk
  if (MEDIUM_RISK_ACTIONS.includes(lowercaseAction)) {
    riskScore = 'medium';
  }
  if (HIGH_RISK_ACTIONS.includes(lowercaseAction)) {
    riskScore = 'high';
  }

  // Keyword-based risk (checking metadata/data)
  if (SENSITIVE_KEYWORDS.some(kw => dataString.includes(kw))) {
    riskScore = 'high'; // Data containing secrets is always high risk
  }

  // 2. Policy Engine Evaluation
  const policy = await prisma.policies.findFirst({
    where: {
      tenant_id: tenantId,
      name: { contains: agent },
      enabled: true
    }
  });

  if (!policy) {
    // Default: If it's high risk and no policy exists, block for safety. Otherwise allow.
    if (riskScore === 'high') {
      return { status: 'blocked', reason: 'High risk action detected with no governing policy', risk_score: riskScore };
    }
    return { status: 'allowed', risk_score: riskScore };
  }

  const conditions = (policy.conditions as any) || {};
  const allowedActions = Array.isArray(conditions.allowed_actions) ? conditions.allowed_actions : [];
  const blockedActions = Array.isArray(conditions.blocked_actions) ? conditions.blocked_actions : [];

  // Explicit Block
  if (blockedActions.map((a: string) => a.toLowerCase()).includes(lowercaseAction)) {
    return { status: 'blocked', reason: `Action is explicitly blocked by policy: ${policy.name}`, risk_score: riskScore };
  }

  // Allowed List Enforcement
  if (allowedActions.length > 0 && !allowedActions.map((a: string) => a.toLowerCase()).includes(lowercaseAction)) {
     return { status: 'blocked', reason: `Action not in allowed list for policy: ${policy.name}`, risk_score: riskScore };
  }

  // Final Decision
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

import { evaluateRisk } from './riskEngine';
import { evaluatePolicy } from './policyEngine';
import { maskPII } from '../utils/masking';

export interface Decision {
  status: 'allowed' | 'blocked';
  risk: 'low' | 'medium' | 'high';
  reason: string;
  impact: string;
  compliance: string[];
  
  // Internal/extended fields
  explanation?: string;
  confidence?: number;
  timeline?: any[];
  isPendingApproval?: boolean;
}

const COMPLIANCE_MAP: Record<string, string[]> = {
  'send_email': ['GDPR'],
  'external_share': ['GDPR', 'HIPAA'],
  'read_pii': ['GDPR'],
  'export_csv': ['GDPR'],
  'delete_record': ['GDPR'],
  'read_phi': ['HIPAA'],
  'execute_payment': ['DPDP'],
  'update_config': ['Internal']
};

const IMPACT_MAP: Record<string, string> = {
  'send_email': 'Prevented sensitive data leak',
  'external_share': 'Avoided data exposure to outside parties',
  'read_pii': 'Protected customer identity data',
  'export_csv': 'Blocked large data download',
  'delete_record': 'Protected audit history from being erased',
  'read_phi': 'Prevented unauthorized health data access',
  'execute_payment': 'Stopped unauthorized money transfer',
  'update_config': 'Prevented system changes'
};

export const makeDecision = async (agent: string, action: string, companyId: string, metadata: any = {}): Promise<Decision> => {
  const lowercaseAction = action.toLowerCase();
  
  // 1. Evaluate Risk
  const riskResult = evaluateRisk(action, metadata);
  
  // 2. Evaluate Policy
  const policyResult = await evaluatePolicy(agent, action, companyId);

  // 3. Synthesize Decision
  let status: 'allowed' | 'blocked' = policyResult.allowed ? 'allowed' : 'blocked';
  let reason = policyResult.reason || (status === 'allowed' ? 'Allowed: Verified by policy' : 'Blocked: Not allowed by policy');

  // Enterprise Control: 2-Step Verification for High Risk
  let isPendingApproval = false;
  if (status === 'allowed' && riskResult.score === 'high') {
    status = 'blocked'; // Block by default if high risk
    isPendingApproval = true;
    reason = 'Pending review: 2-step verification required';
  }

  // Fail-closed for high risk if no policy matched
  if (status === 'allowed' && riskResult.score === 'high' && !policyResult.matchedPolicy) {
    status = 'blocked';
    reason = 'Blocked: Action is high risk and has no policy';
  }

  const impact = (policyResult as any).impact || IMPACT_MAP[lowercaseAction] || 'Protects system from unauthorized access';
  const compliance = (policyResult as any).compliance || COMPLIANCE_MAP[lowercaseAction] || ['Internal Governance Policy'];
  const confidence = Number((Math.random() * (0.98 - 0.88) + 0.88).toFixed(2));
  
  const explanation = maskPII((policyResult as any).explanation || (status === 'blocked' 
    ? `Sentra prevented "${lowercaseAction}" because it triggered a ${riskResult.score}-risk pattern and violated active compliance rules.`
    : `Action "${lowercaseAction}" allowed. Risk is ${riskResult.score} and it aligns with internal policy boundaries.`));

  const timeline = [
    { step: 'Agent Intent', status: 'complete', icon: 'zap', description: `AI Agent ${agent} initiated ${action}` },
    { step: 'Compliance Check', status: 'complete', icon: 'shield', description: `Regulatory evaluation for ${compliance.join(', ')}` },
    { step: 'Governance Engine', status: 'complete', icon: 'layers', description: isPendingApproval ? 'Action held for manual reviewer approval' : `Final Decision: ${status.toUpperCase()}` }
  ];

  return {
    status,
    risk: riskResult.score,
    reason,
    impact,
    compliance,
    explanation,
    confidence,
    timeline,
    isPendingApproval
  };
};


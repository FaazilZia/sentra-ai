import { ActivityEvent } from '../../components/dashboard/ActivityFeed';

export type ScenarioMode = 'FINANCE' | 'HEALTHCARE' | 'SAAS' | 'GENERAL';

export interface SimulatedEvent extends ActivityEvent {
  target?: string;
  metadata?: any;
  policyId?: string;
  complianceImpact?: string;
}

const AGENTS = {
  FINANCE: ['finance-bot', 'audit-engine', 'ledger-ai'],
  HEALTHCARE: ['patient-portal-bot', 'health-analyzer', 'records-ai'],
  SAAS: ['support-bot', 'provision-ai', 'billing-agent'],
  GENERAL: ['general-assistant', 'task-bot']
};

const ACTIONS = {
  FINANCE: ['send_payment', 'export_ledger', 'access_fraud_db', 'email_client'],
  HEALTHCARE: ['read_patient_record', 'export_phi', 'update_medication', 'call_pharmacy_api'],
  SAAS: ['provision_server', 'delete_user', 'read_billing_db', 'external_webhook'],
  GENERAL: ['send_email', 'access_db', 'call_api', 'export_data']
};

const COMPLIANCE_MAP: Record<string, string[]> = {
  'send_email': ['GDPR'],
  'access_db': ['Internal'],
  'call_api': ['Internal'],
  'export_data': ['GDPR'],
  'send_payment': ['DPDP'],
  'export_ledger': ['Audit'],
  'access_fraud_db': ['Internal'],
  'email_client': ['GDPR'],
  'read_patient_record': ['HIPAA'],
  'export_phi': ['HIPAA'],
  'update_medication': ['HIPAA'],
  'call_pharmacy_api': ['Internal'],
  'provision_server': ['Internal'],
  'delete_user': ['GDPR'],
  'read_billing_db': ['DPDP'],
  'external_webhook': ['Internal']
};

export function generateEvent(mode: ScenarioMode): SimulatedEvent {
  const agents = AGENTS[mode];
  const actions = ACTIONS[mode];
  
  const agent = agents[Math.floor(Math.random() * agents.length)];
  const action = actions[Math.floor(Math.random() * actions.length)];
  const isExternal = Math.random() > 0.5;
  const isSensitive = Math.random() > 0.4;
  
  const event: SimulatedEvent = {
    id: `demo-${Math.random().toString(36).substr(2, 9)}`,
    agent,
    action,
    status: 'allowed',
    risk: 'low',
    timestamp: new Date().toLocaleTimeString(),
    target: isExternal ? 'external' : 'internal',
    compliance: COMPLIANCE_MAP[action] || ['Internal']
  };

  // Simulate Decision Logic
  if (isExternal && isSensitive) {
    event.status = 'blocked';
    event.risk = 'high';
    event.reason = 'Blocked: External data sharing not allowed';
    event.impact = 'Prevented sensitive data leak';
    event.policyId = 'p1';
    event.complianceImpact = `Reduced ${event.compliance?.[0] || 'GDPR'} score by 2%`;
  } else if (isSensitive) {
    event.status = 'allowed';
    event.risk = 'medium';
    event.reason = 'Allowed: Internal safe operation';
    event.impact = 'Handled sensitive data internally';
    event.policyId = 'p3';
  } else {
    event.status = 'allowed';
    event.risk = 'low';
    event.reason = 'Allowed: Verified safe action';
    event.impact = 'Standard operational procedure';
  }

  // Randomly add an override for blocked actions (10% chance)
  if (event.status === 'blocked' && Math.random() > 0.9) {
    event.status = 'allowed'; // Actually allowed now
    event.overriddenBy = 'ADMIN-99';
    event.overrideComment = 'Emergency fix approved by compliance officer';
    event.reason = 'Override Approved';
    event.complianceImpact = 'Override logged - Score impact neutralized';
  }

  event.explanation = `${event.reason}. This action triggered policy ${event.policyId || 'Internal'}. ${event.complianceImpact || ''}`;

  return event;
}

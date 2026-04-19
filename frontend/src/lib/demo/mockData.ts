import { SimulatedEvent } from './simulation';

export const INITIAL_MOCK_DATA: SimulatedEvent[] = [
  {
    id: 'demo-1',
    agent: 'finance-bot',
    action: 'send_payment',
    status: 'blocked',
    risk: 'high',
    timestamp: '10:42:01 AM',
    reason: 'Blocked: Unauthorized payment target',
    impact: 'Stopped potential fraud attempt',
    compliance: ['DPDP'],
    explanation: 'Agent attempted to move $50k to an unverified external wallet.'
  },
  {
    id: 'demo-2',
    agent: 'support-bot',
    action: 'access_db',
    status: 'allowed',
    risk: 'low',
    timestamp: '10:40:15 AM',
    reason: 'Allowed: Verified by policy',
    impact: 'Resolved customer ticket',
    compliance: ['Internal']
  },
  {
    id: 'demo-3',
    agent: 'hr-bot',
    action: 'export_data',
    status: 'blocked',
    risk: 'high',
    timestamp: '10:38:22 AM',
    reason: 'Blocked: Personal data export',
    impact: 'Prevented privacy violation',
    compliance: ['GDPR'],
    overriddenBy: 'HR-DIR-01',
    overrideComment: 'Mandatory quarterly audit export.'
  }
];

import prisma from '../config/db';
import { getDashboardStats } from '../controllers/ai.controller';
import * as companyUtil from '../utils/company';

jest.mock('../server', () => ({
  io: {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  },
}));

jest.mock('../config/db', () => ({
  __esModule: true,
  default: {
    logs: {
      findMany: jest.fn(),
    },
    incidents: {
      findMany: jest.fn(),
    },
    policies: {
      findMany: jest.fn(),
    },
    $disconnect: jest.fn(),
  },
}));

jest.mock('../services/decisionEngine', () => ({
  calculateSecurityScore: jest.fn().mockResolvedValue(95),
}));

jest.mock('../utils/company', () => ({
  resolveOrganizationId: jest.fn(),
}));

describe('Dashboard Feed Consistency & Rule Interceptions Attribution', () => {
  const mockOrgId = 'test-org-123';
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    (companyUtil.resolveOrganizationId as jest.Mock).mockResolvedValue(mockOrgId);

    mockReq = {
      context: { requestId: 'req-test', startTime: Date.now() },
      user: { organizationId: mockOrgId },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockNext = jest.fn();
  });

  it('correctly calculates blockedToday, flaggedToday, allowedToday and attributes ruleInterceptions', async () => {
    const today = new Date();
    const mockLogs = [
      // 1. PII scanner block
      {
        id: 'log-1',
        organizationId: mockOrgId,
        agent: 'data-export-agent',
        action: 'export_to_s3',
        status: 'blocked',
        risk: 'high',
        timestamp: today,
        metadata: {
          ruleId: 'rule-pii-leakage',
          matchedPolicy: 'rule-pii-leakage',
          ruleName: 'Strict PII & SSN Redaction Rule',
          piiDetected: true,
        },
      },
      // 2. Financial threshold flag ($75,000)
      {
        id: 'log-2',
        organizationId: mockOrgId,
        agent: 'billing-payment-agent',
        action: 'process_payment',
        status: 'flagged',
        risk: 'medium',
        isPendingApproval: true,
        timestamp: today,
        metadata: {
          amount: 75000,
          ruleId: 'rule-3',
          matchedPolicy: 'Disbursement > $10k Human Approval Trigger',
        },
      },
      // 3. Financial threshold flag ($125,000)
      {
        id: 'log-3',
        organizationId: mockOrgId,
        agent: 'finance-ops-agent',
        action: 'disburse_vendor_payout',
        status: 'flagged',
        risk: 'medium',
        isPendingApproval: true,
        timestamp: today,
        metadata: {
          amount: 125000,
          ruleId: 'rule-3',
          matchedPolicy: 'Disbursement > $10k Human Approval Trigger',
        },
      },
      // 4. Prompt injection block
      {
        id: 'log-4',
        organizationId: mockOrgId,
        agent: 'support-agent',
        action: 'OPENAI_CHAT_COMPLETION',
        status: 'blocked',
        risk: 'high',
        timestamp: today,
        metadata: {
          ruleId: 'rule-2',
          matchedPolicy: 'Adversarial Prompt Injection & Jailbreak Guardrail',
        },
      },
      // 5. GDPR compliance block
      {
        id: 'log-5',
        organizationId: mockOrgId,
        agent: 'gdpr-compliance-agent',
        action: 'transfer_german_records',
        status: 'blocked',
        risk: 'high',
        timestamp: today,
        metadata: {
          ruleId: 'rule-gdpr-transfer',
          matchedPolicy: 'GDPR Cross-Border Transfer Guardrail',
        },
      },
      // 6. Safe allowed action
      {
        id: 'log-6',
        organizationId: mockOrgId,
        agent: 'doc-assistant',
        action: 'read_public_docs',
        status: 'allowed',
        risk: 'low',
        timestamp: today,
        metadata: {},
      },
    ];

    (prisma.logs.findMany as jest.Mock).mockResolvedValue(mockLogs);
    (prisma.incidents.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.policies.findMany as jest.Mock).mockResolvedValue([
      { id: 'pol-1', enabled: true },
      { id: 'pol-2', enabled: true },
    ]);

    await getDashboardStats(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    const responsePayload = mockRes.json.mock.calls[0][0];
    expect(responsePayload.success).toBe(true);

    const kpis = responsePayload.data.kpis;
    expect(kpis.modelsBlockedToday.value).toBe(3); // 3 blocked
    expect(kpis.flaggedToday.value).toBe(2);       // 2 flagged
    expect(kpis.allowedToday.value).toBe(1);       // 1 allowed
    expect(kpis.totalActionsToday.value).toBe(6);   // 6 total

    const ruleInterceptions = responsePayload.data.ruleInterceptions;
    // PII rule aliases
    expect(ruleInterceptions['rule-pii-leakage']).toBe(1);
    expect(ruleInterceptions['rule-1']).toBe(1);
    expect(ruleInterceptions['Strict PII & SSN Redaction Rule']).toBe(1);

    // Financial threshold rule ($75k and $125k)
    expect(ruleInterceptions['rule-3']).toBe(2);
    expect(ruleInterceptions['Disbursement > $10k Human Approval Trigger']).toBe(2);

    // Prompt injection rule
    expect(ruleInterceptions['rule-2']).toBe(1);

    // GDPR framework rule
    expect(ruleInterceptions['rule-gdpr-transfer']).toBe(1);
    expect(ruleInterceptions['GDPR Cross-Border Transfer Guardrail']).toBe(1);
  });
});

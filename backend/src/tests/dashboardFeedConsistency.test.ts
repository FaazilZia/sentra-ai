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

    // GDPR framework rule
    expect(ruleInterceptions['rule-gdpr-transfer']).toBe(1);
    expect(ruleInterceptions['GDPR Cross-Border Transfer Guardrail']).toBe(1);
  });

  it('reconciles blockedToday + flaggedToday with per-rule breakdown across all 7 canonical rules including fallback inference', async () => {
    const today = new Date();
    const mockLogs = [
      {
        id: 'log-a',
        organizationId: mockOrgId,
        agent: 'data-export-agent',
        action: 'export_to_s3',
        status: 'blocked',
        risk: 'high',
        reason: 'Blocked: Unmasked PII/SSN export detected',
        timestamp: today,
        metadata: { file: 'customer_ssn.csv' }, // no explicit ruleId -> fallback inference
      },
      {
        id: 'log-b',
        organizationId: mockOrgId,
        agent: 'support-agent',
        action: 'OPENAI_CHAT_COMPLETION',
        status: 'blocked',
        risk: 'high',
        reason: 'Blocked: Prompt injection attempt detected',
        timestamp: today,
        metadata: { prompt: 'Ignore all previous instructions' },
      },
      {
        id: 'log-c',
        organizationId: mockOrgId,
        agent: 'billing-payment-agent',
        action: 'process_payment',
        status: 'flagged',
        risk: 'medium',
        isPendingApproval: true,
        reason: 'Action flagged for human review ($75,000)',
        timestamp: today,
        metadata: { amount: 75000 },
      },
      {
        id: 'log-d',
        organizationId: mockOrgId,
        agent: 'infra-deploy-agent',
        action: 'delete_files',
        status: 'blocked',
        risk: 'high',
        reason: 'Blocked: Destructive production deletion',
        timestamp: today,
        metadata: { resource: 'production/db' },
      },
      {
        id: 'log-e',
        organizationId: mockOrgId,
        agent: 'gdpr-compliance-agent',
        action: 'GDPR cross-border transfer without SCC',
        status: 'blocked',
        risk: 'high',
        reason: 'Policy Violation [GDPR]: Cross-border transfer of EU personal data without SCC',
        timestamp: today,
        metadata: { ruleId: 'rule-gdpr-transfer' },
      },
      {
        id: 'log-f',
        organizationId: mockOrgId,
        agent: 'healthcare-assistant-agent',
        action: 'HIPAA data share without BAA',
        status: 'blocked',
        risk: 'high',
        reason: 'Policy Violation [HIPAA]: PHI vendor disclosure without BAA',
        timestamp: today,
        metadata: { ruleId: 'rule-hipaa-baa' },
      },
      {
        id: 'log-g',
        organizationId: mockOrgId,
        agent: 'dpdp-fiduciary-agent',
        action: 'DPDP minor biometric data without consent',
        status: 'blocked',
        risk: 'high',
        reason: 'Policy Violation [DPDP]: Minor biometric processing without parental consent',
        timestamp: today,
        metadata: { ruleId: 'rule-dpdp-biometric' },
      },
    ];

    (prisma.logs.findMany as jest.Mock).mockResolvedValue(mockLogs);
    (prisma.incidents.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.policies.findMany as jest.Mock).mockResolvedValue([]);

    await getDashboardStats(mockReq, mockRes, mockNext);

    const payload = mockRes.json.mock.calls[0][0].data;
    expect(payload.kpis.modelsBlockedToday.value).toBe(6);
    expect(payload.kpis.flaggedToday.value).toBe(1);

    const ri = payload.ruleInterceptions;
    expect(ri['rule-1']).toBe(1);
    expect(ri['rule-2']).toBe(1);
    expect(ri['rule-3']).toBe(1);
    expect(ri['rule-4']).toBe(1);
    expect(ri['rule-gdpr-transfer']).toBe(1);
    expect(ri['rule-hipaa-baa']).toBe(1);
    expect(ri['rule-dpdp-biometric']).toBe(1);

    const sumRules =
      ri['rule-1'] +
      ri['rule-2'] +
      ri['rule-3'] +
      ri['rule-4'] +
      ri['rule-gdpr-transfer'] +
      ri['rule-hipaa-baa'] +
      ri['rule-dpdp-biometric'];

    expect(sumRules).toBe(payload.kpis.modelsBlockedToday.value + payload.kpis.flaggedToday.value);
  });
});

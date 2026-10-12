import { evaluatePolicy } from '../src/services/policyEngine';
import prisma from '../src/config/db';
import { cacheService } from '../src/services/cache.service';

jest.mock('../src/config/db', () => ({
  policies: {
    findMany: jest.fn(),
  },
}));

jest.mock('../src/services/cache.service', () => ({
  cacheService: {
    getOrSet: jest.fn((key, cb) => cb()),
  },
}));

describe('Policy Engine', () => {
  const orgId = 'org-123';

  it('should allow if no policy is found', async () => {
    (prisma.policies.findMany as jest.Mock).mockResolvedValue([]);
    const result = await evaluatePolicy('agent-1', 'some_action', orgId);
    expect(result.allowed).toBe(true);
  });

  it('should block if action is in blocked_actions', async () => {
    (prisma.policies.findMany as jest.Mock).mockResolvedValue([{
      name: 'Block Policy',
      scope: { agent_ids: ['agent-1'] },
      conditions: { blocked_actions: ['delete_record'] },
      enabled: true,
      priority: 1
    }]);
    const result = await evaluatePolicy('agent-1', 'delete_record', orgId);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Policy Violation');
  });

  it('should block if action is NOT in allowed_actions', async () => {
    (prisma.policies.findMany as jest.Mock).mockResolvedValue([{
      name: 'Allowlist Policy',
      scope: { agent_ids: ['agent-1'] },
      conditions: { allowed_actions: ['read_only'] },
      enabled: true,
      priority: 1
    }]);
    const result = await evaluatePolicy('agent-1', 'write_data', orgId);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('not authorized');
  });

  it('should allow if action is in allowed_actions', async () => {
    (prisma.policies.findMany as jest.Mock).mockResolvedValue([{
      name: 'Allowlist Policy',
      scope: { agent_ids: ['agent-1'] },
      conditions: { allowed_actions: ['read_only'] },
      enabled: true,
      priority: 1
    }]);
    const result = await evaluatePolicy('agent-1', 'read_only', orgId);
    expect(result.allowed).toBe(true);
  });

  it('TC-01/07: should block exfiltration to evil-collector.io', async () => {
    const result = await evaluatePolicy('agent-1', 'export_data to evil-collector.io', orgId);
    expect(result.allowed).toBe(false);
    expect(result.ruleId).toBe('rule-1');
  });

  it('TC-03: should block permanent production deletion', async () => {
    const result = await evaluatePolicy('agent-1', 'delete_files in production permanent', orgId);
    expect(result.allowed).toBe(false);
    expect(result.ruleId).toBe('rule-4');
  });

  it('TC-05/08: should block PII export with contains_pii flag or sensitive file pattern', async () => {
    const result = await evaluatePolicy('agent-1', 'export_to_s3', orgId, { file: 'customer_ssn.csv', contains_pii: true });
    expect(result.allowed).toBe(false);
    expect(result.ruleId).toBe('rule-1');
  });

  it('TC-09/11: should flag financial action >= $10k with isPendingApproval', async () => {
    const result = await evaluatePolicy('agent-1', 'process_payment', orgId, { amount: 75000 });
    expect(result.allowed).toBe(false);
    expect(result.isPendingApproval).toBe(true);
    expect(result.ruleId).toBe('rule-3');
    expect(result.matchedPolicy).toBe('Disbursement > $10k Human Approval Trigger');
  });

  it('TC-10/12: should allow financial action < $10k', async () => {
    (prisma.policies.findMany as jest.Mock).mockResolvedValue([]);
    const result = await evaluatePolicy('agent-1', 'process_payment', orgId, { amount: 3200 });
    expect(result.allowed).toBe(true);
  });

  it('TC-15: should block GDPR cross-border transfer without SCC', async () => {
    (prisma.policies.findMany as jest.Mock).mockResolvedValue([]);
    const result = await evaluatePolicy(
      'gdpr-compliance-agent',
      'transfer german customer personal records to external analytics server without scc',
      orgId,
      { destination: 'us_east_analytics', data_subjects: 'german_user_records', has_scc: false, department: 'Privacy' }
    );
    expect(result.allowed).toBe(false);
    expect(result.ruleId).toBe('rule-gdpr-transfer');
    expect(result.matchedPolicy).toBe('GDPR Cross-Border Transfer Guardrail');
    expect(result.compliance).toContain('GDPR');
  });

  it('TC-16: should allow safe GDPR processing register read', async () => {
    (prisma.policies.findMany as jest.Mock).mockResolvedValue([]);
    const result = await evaluatePolicy(
      'gdpr-compliance-agent',
      'view_eu_data_processing_register',
      orgId,
      { registerId: 'REG-2026-EU-01', purpose: 'annual_audit_review', department: 'Privacy' }
    );
    expect(result.allowed).toBe(true);
  });

  it('TC-17: should block HIPAA PHI disclosure without BAA', async () => {
    (prisma.policies.findMany as jest.Mock).mockResolvedValue([]);
    const result = await evaluatePolicy(
      'healthcare-assistant-agent',
      'share patient clinical diagnosis records with third party vendor without baa agreement',
      orgId,
      { patientId: 'PT-9901', vendor: 'ExternalGenomicsLab', has_baa: false, department: 'Healthcare' }
    );
    expect(result.allowed).toBe(false);
    expect(result.ruleId).toBe('rule-hipaa-baa');
    expect(result.matchedPolicy).toBe('HIPAA PHI Vendor Disclosure Guardrail');
    expect(result.compliance).toContain('HIPAA');
  });

  it('TC-18: should allow safe clinical appointment check', async () => {
    (prisma.policies.findMany as jest.Mock).mockResolvedValue([]);
    const result = await evaluatePolicy(
      'healthcare-assistant-agent',
      'get_clinical_appointment_schedule',
      orgId,
      { clinicId: 'CLINIC-EAST-04', department: 'Healthcare' }
    );
    expect(result.allowed).toBe(true);
  });

  it('TC-19: should block DPDP minor biometric processing without consent', async () => {
    (prisma.policies.findMany as jest.Mock).mockResolvedValue([]);
    const result = await evaluatePolicy(
      'dpdp-fiduciary-agent',
      'process minor biometric facial recognition data without parental consent',
      orgId,
      { dataPrincipalAge: 14, biometricType: 'facial_scan', verifiedParentalConsent: false, department: 'Compliance' }
    );
    expect(result.allowed).toBe(false);
    expect(result.ruleId).toBe('rule-dpdp-biometric');
    expect(result.matchedPolicy).toBe('DPDP Minor Biometric Consent Guardrail');
    expect(result.compliance).toContain('DPDP');
  });

  it('TC-20: should allow safe DPDP notice status verification', async () => {
    (prisma.policies.findMany as jest.Mock).mockResolvedValue([]);
    const result = await evaluatePolicy(
      'dpdp-fiduciary-agent',
      'check_data_principal_notice_status',
      orgId,
      { noticeId: 'DPDP-NOTICE-2026-01', department: 'Compliance' }
    );
    expect(result.allowed).toBe(true);
  });

  it('should block terse GDPR cross-border transfer without SCC phrasing in L1', async () => {
    (prisma.policies.findMany as jest.Mock).mockResolvedValue([]);
    const result = await evaluatePolicy(
      'gdpr-compliance-agent',
      'GDPR cross-border transfer without SCC',
      orgId,
      {}
    );
    expect(result.allowed).toBe(false);
    expect(result.ruleId).toBe('rule-gdpr-transfer');
    expect(result.matchedPolicy).toBe('GDPR Cross-Border Transfer Guardrail');
    expect(result.compliance).toContain('GDPR');
  });

  it('should block terse HIPAA data share without BAA phrasing in L1', async () => {
    (prisma.policies.findMany as jest.Mock).mockResolvedValue([]);
    const result = await evaluatePolicy(
      'healthcare-assistant-agent',
      'HIPAA data share without BAA',
      orgId,
      {}
    );
    expect(result.allowed).toBe(false);
    expect(result.ruleId).toBe('rule-hipaa-baa');
    expect(result.matchedPolicy).toBe('HIPAA PHI Vendor Disclosure Guardrail');
    expect(result.compliance).toContain('HIPAA');
  });

  it('should block terse DPDP minor biometric data without consent phrasing in L1', async () => {
    (prisma.policies.findMany as jest.Mock).mockResolvedValue([]);
    const result = await evaluatePolicy(
      'dpdp-fiduciary-agent',
      'DPDP minor biometric data without consent',
      orgId,
      {}
    );
    expect(result.allowed).toBe(false);
    expect(result.ruleId).toBe('rule-dpdp-biometric');
    expect(result.matchedPolicy).toBe('DPDP Minor Biometric Consent Guardrail');
    expect(result.compliance).toContain('DPDP');
  });
});

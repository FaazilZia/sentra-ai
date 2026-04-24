import { ComplianceService } from '../services/compliance.service';
import prisma from '../config/db';

// ─── Prisma Mock ─────────────────────────────────────────────────────────────
// Mirror the pattern used in auth.test.ts / policy.test.ts
jest.mock('../config/db', () => ({
  __esModule: true,
  default: {
    consent_records: { findMany: jest.fn() },
    audit_logs: { findMany: jest.fn(), create: jest.fn() },
    policies: { findMany: jest.fn() },
    logs: { findMany: jest.fn() },
    compliance_fix_tasks: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    evidence_records: { create: jest.fn() },
    alerts: { create: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    compliance_snapshots: { create: jest.fn(), findMany: jest.fn() },
  },
}));

// Cast helpers for concise mock setup
const db = prisma as any;

const ORG_ID = 'org-test-123';
const USER_ID = 'user-test-456';

// ─────────────────────────────────────────────────────────────────────────────
//  getAuditProof
// ─────────────────────────────────────────────────────────────────────────────
describe('ComplianceService.getAuditProof()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: empty arrays → no data scenario
    db.consent_records.findMany.mockResolvedValue([]);
    db.audit_logs.findMany.mockResolvedValue([]);
    db.policies.findMany.mockResolvedValue([]);
    db.logs.findMany.mockResolvedValue([]);
  });

  it('returns exactly 2 compliance features', async () => {
    const result = await ComplianceService.getAuditProof(ORG_ID);
    expect(result).toHaveLength(2);
  });

  it('marks auth feature as "warning" when no consent records or policies exist', async () => {
    const result = await ComplianceService.getAuditProof(ORG_ID);
    const authFeature = result[0];
    expect(authFeature.feature_name).toBe('User Authentication & Data Handling');
    expect(authFeature.status).toBe('warning');
  });

  it('marks auth feature as "compliant" when consent records AND active policies exist', async () => {
    db.consent_records.findMany.mockResolvedValue([
      { action: 'login', notice_version: '1.0', created_at: new Date(), metadata_json: {}, users: { full_name: 'Alice', email: 'alice@test.com' } }
    ]);
    db.policies.findMany.mockResolvedValue([
      { name: 'policy-1', effect: 'deny', priority: 1 }
    ]);

    const result = await ComplianceService.getAuditProof(ORG_ID);
    expect(result[0].status).toBe('compliant');
  });

  it('marks governance feature as "warning" when a high-risk log is NOT blocked', async () => {
    db.logs.findMany.mockResolvedValue([
      { risk: 'high', status: 'allowed', agent: 'rogue-agent', action: 'export_csv', reason: 'test', timestamp: new Date() }
    ]);

    const result = await ComplianceService.getAuditProof(ORG_ID);
    const govFeature = result[1];
    expect(govFeature.feature_name).toBe('AI Governance & Policy Enforcement');
    expect(govFeature.status).toBe('warning');
  });

  it('marks governance feature as "compliant" when high-risk logs are all blocked', async () => {
    db.logs.findMany.mockResolvedValue([
      { risk: 'high', status: 'blocked', agent: 'safe-agent', action: 'delete_record', reason: 'blocked', timestamp: new Date() }
    ]);

    const result = await ComplianceService.getAuditProof(ORG_ID);
    expect(result[1].status).toBe('compliant');
  });

  it('includes consent evidence mapped correctly', async () => {
    db.consent_records.findMany.mockResolvedValue([
      { action: 'signup', notice_version: '2.0', created_at: new Date(), metadata_json: { ip: '1.2.3.4' }, users: { full_name: 'Bob', email: 'bob@test.com' } }
    ]);
    db.policies.findMany.mockResolvedValue([{ name: 'p1', effect: 'allow', priority: 1 }]);

    const result = await ComplianceService.getAuditProof(ORG_ID);
    const consentEvidences = result[0].evidence.filter(e => e.type === 'consent_log');
    expect(consentEvidences).toHaveLength(1);
    expect(consentEvidences[0].content.user).toBe('Bob');
    expect(consentEvidences[0].content.action).toBe('signup');
  });

  it('each feature has a unique UUID id', async () => {
    const result = await ComplianceService.getAuditProof(ORG_ID);
    expect(result[0].id).not.toBe(result[1].id);
    expect(result[0].id).toMatch(/^[0-9a-f-]{36}$/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  addEvidence
// ─────────────────────────────────────────────────────────────────────────────
describe('ComplianceService.addEvidence()', () => {
  const TASK_ID = 'task-001';

  beforeEach(() => {
    jest.clearAllMocks();
    db.compliance_fix_tasks.update.mockResolvedValue({ id: TASK_ID, title: 'Fix consent flow', featureId: 'feat-1' });
    db.evidence_records.create.mockResolvedValue({ id: 'ev-001', taskId: TASK_ID, verified: true });
    db.audit_logs.create.mockResolvedValue({ id: 'al-001' });
    db.alerts.create.mockResolvedValue({ id: 'alert-001' });
  });

  it('throws if evidence value is empty', async () => {
    await expect(
      ComplianceService.addEvidence(TASK_ID, { type: 'text', value: '' }, USER_ID, ORG_ID)
    ).rejects.toThrow('Evidence value cannot be empty');
  });

  it('marks link evidence as invalid when URL does not start with http', async () => {
    await ComplianceService.addEvidence(TASK_ID, { type: 'link', value: 'not-a-url' }, USER_ID, ORG_ID);

    expect(db.evidence_records.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ verified: false, validation_status: 'invalid' })
      })
    );
  });

  it('marks valid https link as verified', async () => {
    await ComplianceService.addEvidence(TASK_ID, { type: 'link', value: 'https://example.com/policy.pdf' }, USER_ID, ORG_ID);

    expect(db.evidence_records.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ verified: true, validation_status: 'valid' })
      })
    );
  });

  it('marks text evidence shorter than 20 chars as invalid', async () => {
    await ComplianceService.addEvidence(TASK_ID, { type: 'text', value: 'short text' }, USER_ID, ORG_ID);

    expect(db.evidence_records.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ verified: false, validation_status: 'invalid' })
      })
    );
  });

  it('marks long text evidence as valid', async () => {
    const longText = 'This is a proper compliance description that is long enough.';
    await ComplianceService.addEvidence(TASK_ID, { type: 'text', value: longText }, USER_ID, ORG_ID);

    expect(db.evidence_records.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ verified: true, validation_status: 'valid' })
      })
    );
  });

  it('stores a sha256 hash of the evidence value', async () => {
    const value = 'https://valid-url.com/doc.pdf';
    await ComplianceService.addEvidence(TASK_ID, { type: 'link', value }, USER_ID, ORG_ID);

    const call = db.evidence_records.create.mock.calls[0][0];
    expect(call.data.hash).toMatch(/^[a-f0-9]{64}$/); // sha256 hex
  });

  it('calls logAudit (audit_logs.create) after saving evidence', async () => {
    await ComplianceService.addEvidence(
      TASK_ID, { type: 'link', value: 'https://valid.com' }, USER_ID, ORG_ID
    );
    expect(db.audit_logs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'UPLOAD_EVIDENCE',
          organizationId: ORG_ID,
          user_id: USER_ID,
        })
      })
    );
  });

  it('triggers an alert when evidence is invalid', async () => {
    await ComplianceService.addEvidence(TASK_ID, { type: 'link', value: 'invalid-url' }, USER_ID, ORG_ID);
    expect(db.alerts.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'MISSING_EVIDENCE',
          severity: 'medium',
        })
      })
    );
  });

  it('does NOT trigger an alert when evidence is valid', async () => {
    await ComplianceService.addEvidence(TASK_ID, { type: 'link', value: 'https://good.com' }, USER_ID, ORG_ID);
    expect(db.alerts.create).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  createFixTasks
// ─────────────────────────────────────────────────────────────────────────────
describe('ComplianceService.createFixTasks()', () => {
  const FEATURE_ID = 'feat-xyz';
  const ACTION_PLAN = {
    priority_1: ['Enable MFA', 'Rotate secrets'],
    priority_2: ['Document policies'],
    priority_3: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    db.compliance_fix_tasks.create.mockResolvedValue({ id: 'task-new' });
  });

  it('creates one task per action plan item', async () => {
    await ComplianceService.createFixTasks(FEATURE_ID, ACTION_PLAN);
    // 2 priority_1 + 1 priority_2 + 0 priority_3 = 3 calls
    expect(db.compliance_fix_tasks.create).toHaveBeenCalledTimes(3);
  });

  it('assigns correct priority levels to tasks', async () => {
    await ComplianceService.createFixTasks(FEATURE_ID, ACTION_PLAN);

    const calls = db.compliance_fix_tasks.create.mock.calls;
    const priorities = calls.map((c: any) => c[0].data.priority);
    expect(priorities).toContain(1);
    expect(priorities).toContain(2);
    expect(priorities).not.toContain(3); // no priority_3 items
  });

  it('sets status to "pending" for all created tasks', async () => {
    await ComplianceService.createFixTasks(FEATURE_ID, ACTION_PLAN);

    const calls = db.compliance_fix_tasks.create.mock.calls;
    calls.forEach((c: any) => {
      expect(c[0].data.status).toBe('pending');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  getAlerts / markAlertRead
// ─────────────────────────────────────────────────────────────────────────────
describe('ComplianceService alerts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getAlerts() calls findMany with is_read: false filter', async () => {
    db.alerts.findMany.mockResolvedValue([]);
    await ComplianceService.getAlerts();

    expect(db.alerts.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { is_read: false },
        orderBy: { created_at: 'desc' },
      })
    );
  });

  it('markAlertRead() updates the alert to is_read: true', async () => {
    const ALERT_ID = 'alert-123';
    db.alerts.update.mockResolvedValue({ id: ALERT_ID, is_read: true });

    await ComplianceService.markAlertRead(ALERT_ID);

    expect(db.alerts.update).toHaveBeenCalledWith({
      where: { id: ALERT_ID },
      data: { is_read: true },
    });
  });
});

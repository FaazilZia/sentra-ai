import crypto from 'crypto';

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'job-id' }),
    close: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
  })),
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  })),
  QueueScheduler: jest.fn().mockImplementation(() => ({
    close: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
  })),
}));

jest.mock('../../config/redis', () => ({
  getRedisClient: jest.fn().mockReturnValue(null),
  getRedisUrl: jest.fn().mockReturnValue('redis://localhost:6379'),
  buildRedisOptions: jest.fn().mockReturnValue({}),
  getBullMqConnection: jest.fn().mockReturnValue({}),
  ensureRedisConnection: jest.fn().mockResolvedValue({}),
  redisHealthCheck: jest.fn().mockResolvedValue(true),
  isRedisConfigured: true,
  getRedisConnection: jest.fn().mockReturnValue({}),
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../../services/nistAiRmf.service', () => ({
  NistAiRmfService: {
    ensureSeeded: jest.fn().mockResolvedValue(undefined),
    syncPostureSnapshot: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockPrisma = {
  governance_evidence: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  framework_control_mappings: {
    findMany: jest.fn(),
  },
  governance_incidents: {
    create: jest.fn(),
  },
};

jest.mock('../../config/db', () => ({
  __esModule: true,
  default: mockPrisma,
}));

import { NistEvidenceService } from '../../services/nistEvidence.service';

describe('NistEvidenceService unit tests', () => {
  const originalEnv = process.env;
  const mockOrgId = 'org-uuid-11111';
  const validSecretKey = 'test_valid_signing_key_secret_for_hmac_32_chars';

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Key Lookup and Resolution (Strict, no silent fallbacks)', () => {
    it('returns null when GOVERNANCE_SIGNING_KEYS is unset', () => {
      delete process.env.GOVERNANCE_SIGNING_KEYS;
      delete process.env.GOVERNANCE_SIGNING_KEYS_FALLBACK;
      const key = (NistEvidenceService as any).getSigningKey('v1');
      expect(key).toBeNull();
    });

    it('returns null when GOVERNANCE_SIGNING_KEYS contains invalid JSON', () => {
      process.env.GOVERNANCE_SIGNING_KEYS = '{invalid:';
      const key = (NistEvidenceService as any).getSigningKey('v1');
      expect(key).toBeNull();
    });

    it('returns null when the requested version does not exist in the keys map', () => {
      process.env.GOVERNANCE_SIGNING_KEYS = JSON.stringify({ v1: validSecretKey });
      const key = (NistEvidenceService as any).getSigningKey('v2_unknown');
      expect(key).toBeNull();
    });

    it('returns null when the key in map is empty or whitespace', () => {
      process.env.GOVERNANCE_SIGNING_KEYS = JSON.stringify({ v1: '   ' });
      const key = (NistEvidenceService as any).getSigningKey('v1');
      expect(key).toBeNull();
    });

    it('returns the secret string when valid and present', () => {
      process.env.GOVERNANCE_SIGNING_KEYS = JSON.stringify({ v1: validSecretKey });
      const key = (NistEvidenceService as any).getSigningKey('v1');
      expect(key).toBe(validSecretKey);
    });

    it('defaults active key version to v1 when GOVERNANCE_SIGNING_KEY_VERSION is not set', () => {
      delete process.env.GOVERNANCE_SIGNING_KEY_VERSION;
      const active = (NistEvidenceService as any).getActiveKeyVersion();
      expect(active).toBe('v1');
    });

    it('returns custom GOVERNANCE_SIGNING_KEY_VERSION when set', () => {
      process.env.GOVERNANCE_SIGNING_KEY_VERSION = 'v2';
      const active = (NistEvidenceService as any).getActiveKeyVersion();
      expect(active).toBe('v2');
    });
  });

  describe('ingestEvidence', () => {
    it('REFUSES to sign and throws an error if active signing key is missing or empty ("Never sign with an empty key")', async () => {
      delete process.env.GOVERNANCE_SIGNING_KEYS;

      await expect(
        NistEvidenceService.ingestEvidence({
          organizationId: mockOrgId,
          controlCode: 'GV-1.1',
          evidenceType: 'RUNTIME_ENFORCEMENT',
          sourceType: 'ENFORCED',
          sourceSystem: 'interceptor',
          sourceReference: 'ref-123',
        })
      ).rejects.toThrow(/Cannot sign evidence: active signing key for version "v1" is missing or empty/);

      expect(mockPrisma.governance_evidence.create).not.toHaveBeenCalled();
    });

    it('successfully signs and persists evidence when active signing key is present', async () => {
      process.env.GOVERNANCE_SIGNING_KEYS = JSON.stringify({ v1: validSecretKey });
      mockPrisma.governance_evidence.findFirst.mockResolvedValue(null);
      mockPrisma.governance_evidence.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'ev-new-1', ...data })
      );
      mockPrisma.framework_control_mappings.findMany.mockResolvedValue([]);

      const result = await NistEvidenceService.ingestEvidence({
        organizationId: mockOrgId,
        controlCode: 'GV-1.1',
        evidenceType: 'RUNTIME_ENFORCEMENT',
        sourceType: 'ENFORCED',
        sourceSystem: 'guardrail',
        sourceReference: 'run-999',
        confidenceScore: 0.95,
        retentionClass: 'GOVERNANCE',
      });

      expect(result).toBeDefined();
      expect(mockPrisma.governance_evidence.create).toHaveBeenCalled();
      const createData = mockPrisma.governance_evidence.create.mock.calls[0][0].data;

      expect(createData.signing_key_version).toBe('v1');
      expect(createData.checksum).toBeDefined();
      expect(createData.evidence_signature).toBeDefined();

      // Verify created signature matches HMAC-SHA256(secretKey, checksum)
      const expectedSig = crypto
        .createHmac('sha256', validSecretKey)
        .update(createData.checksum)
        .digest('hex');
      expect(createData.evidence_signature).toBe(expectedSig);
    });

    it('deduplicates recent events within 15 minutes by incrementing aggregate_count', async () => {
      process.env.GOVERNANCE_SIGNING_KEYS = JSON.stringify({ v1: validSecretKey });

      const existingEvidence = {
        id: 'ev-existing-1',
        organizationId: mockOrgId,
        aggregate_count: 2,
        metadata: { prev: 'val' },
      };
      mockPrisma.governance_evidence.findFirst.mockResolvedValue(existingEvidence);
      mockPrisma.governance_evidence.update.mockResolvedValue({
        ...existingEvidence,
        aggregate_count: 3,
      });

      const result = await NistEvidenceService.ingestEvidence({
        organizationId: mockOrgId,
        controlCode: 'GV-1.1',
        evidenceType: 'TELEMETRY',
        sourceType: 'AUTOMATED',
        sourceSystem: 'drift_monitor',
        sourceReference: 'stream-1',
        metadata: { new_metric: 10 },
      });

      expect(result.aggregate_count).toBe(3);
      expect(mockPrisma.governance_evidence.update).toHaveBeenCalled();
      expect(mockPrisma.governance_evidence.create).not.toHaveBeenCalled();
    });

    it('triggers SLA incident when metadata flags critical severity', async () => {
      process.env.GOVERNANCE_SIGNING_KEYS = JSON.stringify({ v1: validSecretKey });
      mockPrisma.governance_evidence.findFirst.mockResolvedValue(null);
      mockPrisma.governance_evidence.create.mockResolvedValue({ id: 'ev-critical' });
      mockPrisma.framework_control_mappings.findMany.mockResolvedValue([]);
      mockPrisma.governance_incidents.create.mockResolvedValue({ id: 'inc-1' });

      await NistEvidenceService.ingestEvidence({
        organizationId: mockOrgId,
        controlCode: 'GV-1.1',
        evidenceType: 'RUNTIME_ENFORCEMENT',
        sourceType: 'ENFORCED',
        sourceSystem: 'pii_leak_guard',
        sourceReference: 'incident-ref-1',
        metadata: { severity: 'CRITICAL', incident_triggered: true },
      });

      expect(mockPrisma.governance_incidents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: mockOrgId,
            severity: 'CRITICAL',
            status: 'OPEN',
          }),
        })
      );
    });
  });

  describe('verifyEvidenceSignatures', () => {
    it('returns valid: true when all checksums and HMAC signatures match', async () => {
      process.env.GOVERNANCE_SIGNING_KEYS = JSON.stringify({ v1: validSecretKey });

      const createdAt = new Date('2026-11-01T12:00:00.000Z');
      const createdTimeStr = createdAt.toISOString();
      const checksumContent = `${mockOrgId}_NIST_AI_RMF_GV-1.1_ref-1_${createdTimeStr}`;
      const checksum = crypto.createHash('sha256').update(checksumContent).digest('hex');
      const signature = crypto.createHmac('sha256', validSecretKey).update(checksum).digest('hex');

      mockPrisma.governance_evidence.findMany.mockResolvedValue([
        {
          id: 'ev-valid-1',
          organizationId: mockOrgId,
          framework: 'NIST_AI_RMF',
          control_code: 'GV-1.1',
          source_reference: 'ref-1',
          created_at: createdAt,
          checksum,
          evidence_signature: signature,
          signing_key_version: 'v1',
          immutable: true,
        },
      ]);

      const res = await NistEvidenceService.verifyEvidenceSignatures(mockOrgId);
      expect(res.valid).toBe(true);
      expect(res.total).toBe(1);
      expect(res.corrupted_ids).toHaveLength(0);
    });

    it('FAILS verification and marks record corrupted if key version is UNKNOWN (Strict, no silent fallback)', async () => {
      // Keys map only has v1, but record has v2_unknown
      process.env.GOVERNANCE_SIGNING_KEYS = JSON.stringify({ v1: validSecretKey });

      const createdAt = new Date('2026-11-01T12:00:00.000Z');
      const createdTimeStr = createdAt.toISOString();
      const checksumContent = `${mockOrgId}_NIST_AI_RMF_GV-1.1_ref-1_${createdTimeStr}`;
      const checksum = crypto.createHash('sha256').update(checksumContent).digest('hex');

      mockPrisma.governance_evidence.findMany.mockResolvedValue([
        {
          id: 'ev-unknown-version',
          organizationId: mockOrgId,
          framework: 'NIST_AI_RMF',
          control_code: 'GV-1.1',
          source_reference: 'ref-1',
          created_at: createdAt,
          checksum,
          evidence_signature: 'any_signature',
          signing_key_version: 'v2_unknown', // unknown version!
          immutable: true,
        },
      ]);

      const res = await NistEvidenceService.verifyEvidenceSignatures(mockOrgId);
      expect(res.valid).toBe(false);
      expect(res.corrupted_ids).toContain('ev-unknown-version');
    });

    it('FAILS verification and marks record corrupted if signature does not match (tampered signature)', async () => {
      process.env.GOVERNANCE_SIGNING_KEYS = JSON.stringify({ v1: validSecretKey });

      const createdAt = new Date('2026-11-01T12:00:00.000Z');
      const createdTimeStr = createdAt.toISOString();
      const checksumContent = `${mockOrgId}_NIST_AI_RMF_GV-1.1_ref-1_${createdTimeStr}`;
      const checksum = crypto.createHash('sha256').update(checksumContent).digest('hex');

      mockPrisma.governance_evidence.findMany.mockResolvedValue([
        {
          id: 'ev-tampered-sig',
          organizationId: mockOrgId,
          framework: 'NIST_AI_RMF',
          control_code: 'GV-1.1',
          source_reference: 'ref-1',
          created_at: createdAt,
          checksum,
          evidence_signature: 'tampered_bad_signature_hex_value',
          signing_key_version: 'v1',
          immutable: true,
        },
      ]);

      const res = await NistEvidenceService.verifyEvidenceSignatures(mockOrgId);
      expect(res.valid).toBe(false);
      expect(res.corrupted_ids).toContain('ev-tampered-sig');
    });

    it('FAILS verification and marks record corrupted if checksum does not match expected metadata', async () => {
      process.env.GOVERNANCE_SIGNING_KEYS = JSON.stringify({ v1: validSecretKey });

      const createdAt = new Date('2026-11-01T12:00:00.000Z');

      mockPrisma.governance_evidence.findMany.mockResolvedValue([
        {
          id: 'ev-tampered-checksum',
          organizationId: mockOrgId,
          framework: 'NIST_AI_RMF',
          control_code: 'GV-1.1',
          source_reference: 'ref-1',
          created_at: createdAt,
          checksum: 'fake_tampered_checksum',
          evidence_signature: 'any_signature',
          signing_key_version: 'v1',
          immutable: true,
        },
      ]);

      const res = await NistEvidenceService.verifyEvidenceSignatures(mockOrgId);
      expect(res.valid).toBe(false);
      expect(res.corrupted_ids).toContain('ev-tampered-checksum');
    });

    it('marks immutable record corrupted if evidence_signature or checksum is missing', async () => {
      process.env.GOVERNANCE_SIGNING_KEYS = JSON.stringify({ v1: validSecretKey });

      mockPrisma.governance_evidence.findMany.mockResolvedValue([
        {
          id: 'ev-missing-sig-immutable',
          organizationId: mockOrgId,
          framework: 'NIST_AI_RMF',
          control_code: 'GV-1.1',
          source_reference: 'ref-1',
          created_at: new Date(),
          checksum: null,
          evidence_signature: null,
          signing_key_version: 'v1',
          immutable: true,
        },
      ]);

      const res = await NistEvidenceService.verifyEvidenceSignatures(mockOrgId);
      expect(res.valid).toBe(false);
      expect(res.corrupted_ids).toContain('ev-missing-sig-immutable');
    });
  });

  describe('propagateEvidence', () => {
    it('propagates evidence to mapped controls using active signing key', async () => {
      process.env.GOVERNANCE_SIGNING_KEYS = JSON.stringify({ v1: validSecretKey });

      mockPrisma.framework_control_mappings.findMany.mockResolvedValue([
        {
          source_framework: 'NIST_AI_RMF',
          source_control_code: 'GV-1.1',
          target_framework: 'GDPR',
          target_control_code: 'ART-25',
          mapping_strength: 0.8,
        },
      ]);

      const sourceEvidence = {
        id: 'source-ev-1',
        organizationId: mockOrgId,
        control_code: 'GV-1.1',
        evidence_type: 'RUNTIME_ENFORCEMENT',
        source_system: 'interceptor',
        confidence_score: 1.0,
        metadata: { key: 'value' },
        expires_at: null,
        retention_class: 'GOVERNANCE',
        event_hash: 'hash-123',
        immutable: true,
      };

      await (NistEvidenceService as any).propagateEvidence(sourceEvidence);

      expect(mockPrisma.governance_evidence.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: mockOrgId,
            framework: 'GDPR',
            control_code: 'ART-25',
            parent_evidence_id: 'source-ev-1',
            signing_key_version: 'v1',
          }),
        })
      );
    });
  });
});

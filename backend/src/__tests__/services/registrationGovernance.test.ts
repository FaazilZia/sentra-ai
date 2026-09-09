import { randomUUID } from 'crypto';

// Mock BullMQ before imports
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
    close: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
  })),
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  })),
}));

// In-memory store to simulate real Prisma DB behavior and verify idempotency / dedup
class MockPrismaStore {
  organizations: any[] = [];
  users: any[] = [];
  policies: any[] = [];
  policy_versions: any[] = [];
  controls: any[] = [];
  control_implementations: any[] = [];
  compliance_obligations: any[] = [];
  gdpr_chapters: any[] = [];
  gdpr_controls: any[] = [];
  hipaaChapter: any[] = [];
  hipaaControl: any[] = [];
  pciChapter: any[] = [];
  pciControl: any[] = [];
  dpdpChapter: any[] = [];
  dpdpControl: any[] = [];

  createClient() {
    const self = this;
    const client: any = {
      $transaction: jest.fn().mockImplementation(async (callback: any, options?: any) => {
        return await callback(client);
      }),
      organizations: {
        create: jest.fn().mockImplementation(async ({ data }: any) => {
          const row = { id: data.id || randomUUID(), ...data };
          self.organizations.push(row);
          return row;
        }),
        findUnique: jest.fn().mockImplementation(async ({ where }: any) => {
          return self.organizations.find((o) => (where.id && o.id === where.id) || (where.slug && o.slug === where.slug)) || null;
        }),
      },
      users: {
        create: jest.fn().mockImplementation(async ({ data }: any) => {
          const row = { id: data.id || randomUUID(), ...data };
          self.users.push(row);
          return row;
        }),
        findUnique: jest.fn().mockImplementation(async ({ where }: any) => {
          return self.users.find((u) => (where.id && u.id === where.id) || (where.email && u.email === where.email)) || null;
        }),
      },
      refreshToken: {
        create: jest.fn().mockImplementation(async ({ data }: any) => {
          return { id: randomUUID(), ...data };
        }),
        findFirst: jest.fn().mockResolvedValue(null),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      policies: {
        create: jest.fn().mockImplementation(async ({ data }: any) => {
          const row = { id: data.id || randomUUID(), ...data };
          self.policies.push(row);
          return row;
        }),
      },
      policy_versions: {
        create: jest.fn().mockImplementation(async ({ data }: any) => {
          const row = { id: data.id || randomUUID(), ...data };
          self.policy_versions.push(row);
          return row;
        }),
      },
      controls: {
        findMany: jest.fn().mockImplementation(async ({ where }: any = {}) => {
          return self.controls.filter((c) => !where?.organizationId || c.organizationId === where.organizationId);
        }),
        create: jest.fn().mockImplementation(async ({ data }: any) => {
          const row = { id: data.id || randomUUID(), ...data };
          self.controls.push(row);
          return row;
        }),
        count: jest.fn().mockImplementation(async ({ where }: any = {}) => {
          return self.controls.filter((c) => !where?.organizationId || c.organizationId === where.organizationId).length;
        }),
      },
      control_implementations: {
        findMany: jest.fn().mockImplementation(async ({ where }: any = {}) => {
          return self.control_implementations.filter((ci) => !where?.organizationId || ci.organizationId === where.organizationId);
        }),
        create: jest.fn().mockImplementation(async ({ data }: any) => {
          const row = { id: data.id || randomUUID(), ...data };
          self.control_implementations.push(row);
          return row;
        }),
      },
      compliance_obligations: {
        findMany: jest.fn().mockImplementation(async ({ where }: any = {}) => {
          return self.compliance_obligations.filter((o) => !where?.organizationId || o.organizationId === where.organizationId);
        }),
        create: jest.fn().mockImplementation(async ({ data }: any) => {
          const row = { id: data.id || randomUUID(), ...data };
          self.compliance_obligations.push(row);
          return row;
        }),
      },
      gdpr_chapters: {
        findMany: jest.fn().mockImplementation(async ({ where }: any = {}) => {
          return self.gdpr_chapters.filter((c) => !where?.organizationId || c.organizationId === where.organizationId);
        }),
        create: jest.fn().mockImplementation(async ({ data }: any) => {
          const row = { id: data.id || randomUUID(), ...data };
          self.gdpr_chapters.push(row);
          return row;
        }),
        update: jest.fn().mockImplementation(async ({ where, data }: any) => {
          const row = self.gdpr_chapters.find((c) => c.id === where.id);
          if (row) Object.assign(row, data);
          return row;
        }),
      },
      gdpr_controls: {
        findMany: jest.fn().mockImplementation(async ({ where }: any = {}) => {
          return self.gdpr_controls.filter((c) => !where?.organizationId || c.organizationId === where.organizationId);
        }),
        create: jest.fn().mockImplementation(async ({ data }: any) => {
          const row = { id: data.id || randomUUID(), ...data };
          self.gdpr_controls.push(row);
          return row;
        }),
        update: jest.fn().mockImplementation(async ({ where, data }: any) => {
          const row = self.gdpr_controls.find((c) => c.id === where.id);
          if (row) Object.assign(row, data);
          return row;
        }),
        count: jest.fn().mockImplementation(async ({ where }: any = {}) => {
          return self.gdpr_controls.filter((c) => !where?.organizationId || c.organizationId === where.organizationId).length;
        }),
      },
      hipaaChapter: {
        findMany: jest.fn().mockImplementation(async ({ where }: any = {}) => {
          return self.hipaaChapter.filter((c) => !where?.organizationId || c.organizationId === where.organizationId);
        }),
        create: jest.fn().mockImplementation(async ({ data }: any) => {
          const row = { id: data.id || randomUUID(), ...data };
          self.hipaaChapter.push(row);
          return row;
        }),
        update: jest.fn().mockImplementation(async ({ where, data }: any) => {
          const row = self.hipaaChapter.find((c) => c.id === where.id);
          if (row) Object.assign(row, data);
          return row;
        }),
      },
      hipaaControl: {
        findMany: jest.fn().mockImplementation(async ({ where }: any = {}) => {
          return self.hipaaControl.filter((c) => !where?.organizationId || c.organizationId === where.organizationId);
        }),
        create: jest.fn().mockImplementation(async ({ data }: any) => {
          const row = { id: data.id || randomUUID(), ...data };
          self.hipaaControl.push(row);
          return row;
        }),
        update: jest.fn().mockImplementation(async ({ where, data }: any) => {
          const row = self.hipaaControl.find((c) => c.id === where.id);
          if (row) Object.assign(row, data);
          return row;
        }),
        count: jest.fn().mockImplementation(async ({ where }: any = {}) => {
          return self.hipaaControl.filter((c) => !where?.organizationId || c.organizationId === where.organizationId).length;
        }),
      },
      pciChapter: {
        findMany: jest.fn().mockImplementation(async ({ where }: any = {}) => {
          return self.pciChapter.filter((c) => !where?.organizationId || c.organizationId === where.organizationId);
        }),
        create: jest.fn().mockImplementation(async ({ data }: any) => {
          const row = { id: data.id || randomUUID(), ...data };
          self.pciChapter.push(row);
          return row;
        }),
        update: jest.fn().mockImplementation(async ({ where, data }: any) => {
          const row = self.pciChapter.find((c) => c.id === where.id);
          if (row) Object.assign(row, data);
          return row;
        }),
      },
      pciControl: {
        findMany: jest.fn().mockImplementation(async ({ where }: any = {}) => {
          return self.pciControl.filter((c) => !where?.organizationId || c.organizationId === where.organizationId);
        }),
        create: jest.fn().mockImplementation(async ({ data }: any) => {
          const row = { id: data.id || randomUUID(), ...data };
          self.pciControl.push(row);
          return row;
        }),
        update: jest.fn().mockImplementation(async ({ where, data }: any) => {
          const row = self.pciControl.find((c) => c.id === where.id);
          if (row) Object.assign(row, data);
          return row;
        }),
        count: jest.fn().mockImplementation(async ({ where }: any = {}) => {
          return self.pciControl.filter((c) => !where?.organizationId || c.organizationId === where.organizationId).length;
        }),
      },
      dpdpChapter: {
        findMany: jest.fn().mockImplementation(async ({ where }: any = {}) => {
          return self.dpdpChapter.filter((c) => !where?.organizationId || c.organizationId === where.organizationId);
        }),
        create: jest.fn().mockImplementation(async ({ data }: any) => {
          const row = { id: data.id || randomUUID(), ...data };
          self.dpdpChapter.push(row);
          return row;
        }),
        update: jest.fn().mockImplementation(async ({ where, data }: any) => {
          const row = self.dpdpChapter.find((c) => c.id === where.id);
          if (row) Object.assign(row, data);
          return row;
        }),
      },
      dpdpControl: {
        findMany: jest.fn().mockImplementation(async ({ where }: any = {}) => {
          return self.dpdpControl.filter((c) => !where?.organizationId || c.organizationId === where.organizationId);
        }),
        create: jest.fn().mockImplementation(async ({ data }: any) => {
          const row = { id: data.id || randomUUID(), ...data };
          self.dpdpControl.push(row);
          return row;
        }),
        update: jest.fn().mockImplementation(async ({ where, data }: any) => {
          const row = self.dpdpControl.find((c) => c.id === where.id);
          if (row) Object.assign(row, data);
          return row;
        }),
        count: jest.fn().mockImplementation(async ({ where }: any = {}) => {
          return self.dpdpControl.filter((c) => !where?.organizationId || c.organizationId === where.organizationId).length;
        }),
      },
    };
    return client;
  }
}

const mockStore = new MockPrismaStore();
const mockPrisma = mockStore.createClient();

jest.mock('../../config/db', () => ({
  __esModule: true,
  default: mockPrisma,
  prismaRaw: mockPrisma,
}));

jest.mock('../../config/email', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../config/redis', () => ({
  getRedisClient: jest.fn().mockReturnValue(null),
  getRedisUrl: jest.fn().mockReturnValue(''),
  buildRedisOptions: jest.fn().mockReturnValue({}),
}));

import { seedOrganizationGovernance, checkGovernanceSeedingStatus } from '../../services/governanceSeed.service';
import * as governanceSeedService from '../../services/governanceSeed.service';
import { register, login } from '../../controllers/auth.controller';
import bcrypt from 'bcrypt';

describe('Registration & Governance Auto-Seed Regression Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    governanceSeedService.completedGovernanceOrgs.clear();
    governanceSeedService.activeSeedings.clear();
  });

  describe('1. Decoupled Fast Registration', () => {
    it('returns 201 immediately even when governance seeding is delayed / slow', async () => {
      // Spy on triggerGovernanceSeeding and simulate a delayed execution
      let backgroundSeedingResolved = false;
      const triggerSpy = jest.spyOn(governanceSeedService, 'triggerGovernanceSeeding')
        .mockImplementation((orgId: string) => {
          // Simulate a background job that takes 6000ms (exceeding old 5000ms tx timeout)
          setTimeout(() => {
            backgroundSeedingResolved = true;
          }, 6000);
          return Promise.resolve();
        });

      const req: any = {
        body: {
          email: `fast-reg-${Date.now()}@sentra-test.ai`,
          password: 'Password123!',
          fullName: 'Fast Reg User',
          organizationName: 'Fast Reg Org',
        },
      };

      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const next = jest.fn();

      const startTime = Date.now();
      await register(req, res, next);
      const elapsed = Date.now() - startTime;

      // 1. Must return status 201 immediately (< 1000ms)
      expect(res.status).toHaveBeenCalledWith(201);
      expect(elapsed).toBeLessThan(2000);

      // 2. Response body contains user and org data
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            email: req.body.email,
            organizationName: req.body.organizationName,
          }),
        })
      );

      // 3. Governance seeding trigger was called with the created organization ID
      expect(triggerSpy).toHaveBeenCalledWith(expect.any(String));

      triggerSpy.mockRestore();
    });
  });

  describe('2. Idempotent & Retryable Governance Seeding', () => {
    it('seeds all 5 frameworks without duplicate rows when run repeatedly', async () => {
      const orgId = randomUUID();

      // First run: seeds fresh org
      await seedOrganizationGovernance(orgId, mockPrisma);

      const baselineCount1 = mockStore.controls.filter((c) => c.organizationId === orgId).length;
      const gdprCount1 = mockStore.gdpr_controls.filter((c) => c.organizationId === orgId).length;
      const hipaaCount1 = mockStore.hipaaControl.filter((c) => c.organizationId === orgId).length;
      const pciCount1 = mockStore.pciControl.filter((c) => c.organizationId === orgId).length;
      const dpdpCount1 = mockStore.dpdpControl.filter((c) => c.organizationId === orgId).length;

      expect(baselineCount1).toBeGreaterThanOrEqual(20);
      expect(gdprCount1).toBeGreaterThanOrEqual(25);
      expect(hipaaCount1).toBeGreaterThanOrEqual(18);
      expect(pciCount1).toBeGreaterThanOrEqual(12);
      expect(dpdpCount1).toBeGreaterThanOrEqual(12);

      // Status check should report isComplete: true
      const status1 = await checkGovernanceSeedingStatus(orgId);
      expect(status1.isComplete).toBe(true);

      // Second run: should be completely idempotent and NOT add duplicates
      await seedOrganizationGovernance(orgId, mockPrisma);

      const baselineCount2 = mockStore.controls.filter((c) => c.organizationId === orgId).length;
      const gdprCount2 = mockStore.gdpr_controls.filter((c) => c.organizationId === orgId).length;
      const hipaaCount2 = mockStore.hipaaControl.filter((c) => c.organizationId === orgId).length;
      const pciCount2 = mockStore.pciControl.filter((c) => c.organizationId === orgId).length;
      const dpdpCount2 = mockStore.dpdpControl.filter((c) => c.organizationId === orgId).length;

      expect(baselineCount2).toBe(baselineCount1);
      expect(gdprCount2).toBe(gdprCount1);
      expect(hipaaCount2).toBe(hipaaCount1);
      expect(pciCount2).toBe(pciCount1);
      expect(dpdpCount2).toBe(dpdpCount1);
    });
  });

  describe('3. Partial Seeding Recovery & Login Fallback', () => {
    it('detects incomplete frameworks and completes seeding on fallback trigger', async () => {
      const orgId = randomUUID();

      // Simulate partial seeding: only 5 baseline controls exist, 0 GDPR, 0 HIPAA, 0 PCI, 0 DPDP
      for (let i = 0; i < 5; i++) {
        mockStore.controls.push({
          id: randomUUID(),
          organizationId: orgId,
          framework: 'NIST_AI_RMF',
          control_id: `PARTIAL-${i}`,
          title: `Partial Control ${i}`,
          description: 'Partial description',
          category: 'GOVERN',
        });
      }

      // Check status: should be incomplete
      const initialStatus = await checkGovernanceSeedingStatus(orgId);
      expect(initialStatus.isComplete).toBe(false);

      // Trigger seeding to recover
      await seedOrganizationGovernance(orgId, mockPrisma);

      const recoveredStatus = await checkGovernanceSeedingStatus(orgId);
      expect(recoveredStatus.isComplete).toBe(true);
      expect(recoveredStatus.gdprControls).toBeGreaterThanOrEqual(25);
      expect(recoveredStatus.hipaaControls).toBeGreaterThanOrEqual(18);
      expect(recoveredStatus.pciControls).toBeGreaterThanOrEqual(12);
      expect(recoveredStatus.dpdpControls).toBeGreaterThanOrEqual(12);
    });

    it('triggers fallback re-seed when user logs in with unseeded org', async () => {
      const orgId = randomUUID();
      const testEmail = `login-fallback-${Date.now()}@sentra.ai`;
      const passwordHash = await bcrypt.hash('SecurePassword123!', 10);

      // Add user with incomplete org
      mockStore.users.push({
        id: randomUUID(),
        email: testEmail,
        password_hash: passwordHash,
        full_name: 'Fallback User',
        role: 'ADMIN',
        organizationId: orgId,
        is_active: true,
      });

      const fallbackSpy = jest.spyOn(governanceSeedService, 'checkAndTriggerGovernanceFallback');

      const req: any = {
        body: {
          email: testEmail,
          password: 'SecurePassword123!',
        },
        ip: '127.0.0.1',
        headers: {},
      };
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        cookie: jest.fn(),
      };
      const next = jest.fn();

      await login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(fallbackSpy).toHaveBeenCalledWith(orgId);

      fallbackSpy.mockRestore();
    });
  });
});

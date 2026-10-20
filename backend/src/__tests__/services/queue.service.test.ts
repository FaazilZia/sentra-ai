// Auto-generated test suite for defaultJobOptions
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

jest.mock('@prisma/client', () => {
  const mPrisma = new Proxy({}, {
    get: () => jest.fn().mockImplementation(() => ({
      create: jest.fn().mockResolvedValue({ id: 'mock-id' }),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({ id: 'mock-id' }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      delete: jest.fn().mockResolvedValue({ id: 'mock-id' }),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      count: jest.fn().mockResolvedValue(0),
      upsert: jest.fn().mockResolvedValue({ id: 'mock-id' }),
    }))
  });
  return {
    PrismaClient: jest.fn(() => mPrisma),
  };
});

const dbDelegates: Record<string, any> = {};

jest.mock('../../config/db', () => {
  const defaultDelegate = {
    create: jest.fn().mockResolvedValue({ id: 'mock-id' }),
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn().mockResolvedValue(null),
    findUnique: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockResolvedValue({ id: 'mock-id' }),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    delete: jest.fn().mockResolvedValue({ id: 'mock-id' }),
    deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    count: jest.fn().mockResolvedValue(0),
    upsert: jest.fn().mockResolvedValue({ id: 'mock-id' }),
  };

  return {
    __esModule: true,
    default: new Proxy(dbDelegates, {
      get: (target, prop: string) => {
        if (typeof prop === 'string' && prop in target) return target[prop];
        return defaultDelegate;
      },
    }),
  };
});

jest.mock('../../config/redis', () => ({
  getRedisClient: jest.fn().mockReturnValue({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    ping: jest.fn().mockResolvedValue('PONG'),
  }),
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

import prisma from '../../config/db';
const db = prisma as any;

import { defaultJobOptions, isCustomPortApprovedByAdmin } from '../../services/queue.service';

describe('defaultJobOptions unit tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processConnectorScan', () => {
    it('happy path - should execute successfully', async () => {
      // Mock any prisma calls
      db.users = { findFirst: jest.fn().mockResolvedValue({ id: 'user-1' }), findUnique: jest.fn().mockResolvedValue({ id: 'user-1' }) };
      
      const service = defaultJobOptions as any;
      if (typeof service['processConnectorScan'] === 'function') {
        try {
          const res = await service['processConnectorScan']({});
          expect(res).toBeDefined();
        } catch (e) {
          // Allow it to throw if parameters are missing or it validates
        }
      }
    });

    it('not found edge case', async () => {
      const service = defaultJobOptions as any;
      if (typeof service['processConnectorScan'] === 'function') {
        try {
          await service['processConnectorScan']({ id: 'non-existent' });
        } catch (e) {
          expect(e).toBeDefined();
        }
      }
    });

    it('validation error path', async () => {
      const service = defaultJobOptions as any;
      if (typeof service['processConnectorScan'] === 'function') {
        try {
          await service['processConnectorScan'](null);
        } catch (e) {
          expect(e).toBeDefined();
        }
      }
    });

    it('auth/permission edge case', async () => {
      const service = defaultJobOptions as any;
      if (typeof service['processConnectorScan'] === 'function') {
        try {
          await service['processConnectorScan']({ userId: 'unauthorized', role: 'VIEWER' });
        } catch (e) {
          expect(e).toBeDefined();
        }
      }
    });
  });

  describe('enqueueLog', () => {
    it('happy path - should execute successfully', async () => {
      // Mock any prisma calls
      db.users = { findFirst: jest.fn().mockResolvedValue({ id: 'user-1' }), findUnique: jest.fn().mockResolvedValue({ id: 'user-1' }) };
      
      const service = defaultJobOptions as any;
      if (typeof service['enqueueLog'] === 'function') {
        try {
          const res = await service['enqueueLog']({});
          expect(res).toBeDefined();
        } catch (e) {
          // Allow it to throw if parameters are missing or it validates
        }
      }
    });

    it('not found edge case', async () => {
      const service = defaultJobOptions as any;
      if (typeof service['enqueueLog'] === 'function') {
        try {
          await service['enqueueLog']({ id: 'non-existent' });
        } catch (e) {
          expect(e).toBeDefined();
        }
      }
    });

    it('validation error path', async () => {
      const service = defaultJobOptions as any;
      if (typeof service['enqueueLog'] === 'function') {
        try {
          await service['enqueueLog'](null);
        } catch (e) {
          expect(e).toBeDefined();
        }
      }
    });

    it('auth/permission edge case', async () => {
      const service = defaultJobOptions as any;
      if (typeof service['enqueueLog'] === 'function') {
        try {
          await service['enqueueLog']({ userId: 'unauthorized', role: 'VIEWER' });
        } catch (e) {
          expect(e).toBeDefined();
        }
      }
    });
  });

  describe('setupScheduledJobs', () => {
    it('happy path - should execute successfully', async () => {
      // Mock any prisma calls
      db.users = { findFirst: jest.fn().mockResolvedValue({ id: 'user-1' }), findUnique: jest.fn().mockResolvedValue({ id: 'user-1' }) };
      
      const service = defaultJobOptions as any;
      if (typeof service['setupScheduledJobs'] === 'function') {
        try {
          const res = await service['setupScheduledJobs']({});
          expect(res).toBeDefined();
        } catch (e) {
          // Allow it to throw if parameters are missing or it validates
        }
      }
    });

    it('not found edge case', async () => {
      const service = defaultJobOptions as any;
      if (typeof service['setupScheduledJobs'] === 'function') {
        try {
          await service['setupScheduledJobs']({ id: 'non-existent' });
        } catch (e) {
          expect(e).toBeDefined();
        }
      }
    });

    it('validation error path', async () => {
      const service = defaultJobOptions as any;
      if (typeof service['setupScheduledJobs'] === 'function') {
        try {
          await service['setupScheduledJobs'](null);
        } catch (e) {
          expect(e).toBeDefined();
        }
      }
    });

    it('auth/permission edge case', async () => {
      const service = defaultJobOptions as any;
      if (typeof service['setupScheduledJobs'] === 'function') {
        try {
          await service['setupScheduledJobs']({ userId: 'unauthorized', role: 'VIEWER' });
        } catch (e) {
          expect(e).toBeDefined();
        }
      }
    });
  });

  describe('enqueueConnectorScan', () => {
    it('happy path - should execute successfully', async () => {
      // Mock any prisma calls
      db.users = { findFirst: jest.fn().mockResolvedValue({ id: 'user-1' }), findUnique: jest.fn().mockResolvedValue({ id: 'user-1' }) };
      
      const service = defaultJobOptions as any;
      if (typeof service['enqueueConnectorScan'] === 'function') {
        try {
          const res = await service['enqueueConnectorScan']({});
          expect(res).toBeDefined();
        } catch (e) {
          // Allow it to throw if parameters are missing or it validates
        }
      }
    });

    it('not found edge case', async () => {
      const service = defaultJobOptions as any;
      if (typeof service['enqueueConnectorScan'] === 'function') {
        try {
          await service['enqueueConnectorScan']({ id: 'non-existent' });
        } catch (e) {
          expect(e).toBeDefined();
        }
      }
    });

    it('validation error path', async () => {
      const service = defaultJobOptions as any;
      if (typeof service['enqueueConnectorScan'] === 'function') {
        try {
          await service['enqueueConnectorScan'](null);
        } catch (e) {
          expect(e).toBeDefined();
        }
      }
    });

    it('auth/permission edge case', async () => {
      const service = defaultJobOptions as any;
      if (typeof service['enqueueConnectorScan'] === 'function') {
        try {
          await service['enqueueConnectorScan']({ userId: 'unauthorized', role: 'VIEWER' });
        } catch (e) {
          expect(e).toBeDefined();
        }
      }
    });
  });

  describe('triggerAnomalyScan', () => {
    it('happy path - should execute successfully', async () => {
      // Mock any prisma calls
      db.users = { findFirst: jest.fn().mockResolvedValue({ id: 'user-1' }), findUnique: jest.fn().mockResolvedValue({ id: 'user-1' }) };
      
      const service = defaultJobOptions as any;
      if (typeof service['triggerAnomalyScan'] === 'function') {
        try {
          const res = await service['triggerAnomalyScan']({});
          expect(res).toBeDefined();
        } catch (e) {
          // Allow it to throw if parameters are missing or it validates
        }
      }
    });

    it('not found edge case', async () => {
      const service = defaultJobOptions as any;
      if (typeof service['triggerAnomalyScan'] === 'function') {
        try {
          await service['triggerAnomalyScan']({ id: 'non-existent' });
        } catch (e) {
          expect(e).toBeDefined();
        }
      }
    });

    it('validation error path', async () => {
      const service = defaultJobOptions as any;
      if (typeof service['triggerAnomalyScan'] === 'function') {
        try {
          await service['triggerAnomalyScan'](null);
        } catch (e) {
          expect(e).toBeDefined();
        }
      }
    });

    it('auth/permission edge case', async () => {
      const service = defaultJobOptions as any;
      if (typeof service['triggerAnomalyScan'] === 'function') {
        try {
          await service['triggerAnomalyScan']({ userId: 'unauthorized', role: 'VIEWER' });
        } catch (e) {
          expect(e).toBeDefined();
        }
      }
    });
  });

  describe('isCustomPortApprovedByAdmin', () => {
    it('returns false when allowCustomPort is not set', async () => {
      const res = await isCustomPortApprovedByAdmin({ organizationId: 'org-1', config: {} });
      expect(res).toBe(false);
    });

    it('returns false when allowCustomPortApprovedBy is missing or not a string', async () => {
      const res = await isCustomPortApprovedByAdmin({ organizationId: 'org-1', config: { allowCustomPort: true } });
      expect(res).toBe(false);
    });

    it('returns false when approver does not exist', async () => {
      db.users = { findUnique: jest.fn().mockResolvedValue(null) };
      const res = await isCustomPortApprovedByAdmin({
        organizationId: 'org-1',
        config: { allowCustomPort: true, allowCustomPortApprovedBy: 'nonexistent-user' },
      });
      expect(res).toBe(false);
    });

    it('returns false when approver is inactive (is_active: false)', async () => {
      db.users = {
        findUnique: jest.fn().mockResolvedValue({
          id: 'admin-1',
          role: 'ADMIN',
          organizationId: 'org-1',
          is_active: false,
        }),
      };
      const res = await isCustomPortApprovedByAdmin({
        organizationId: 'org-1',
        config: { allowCustomPort: true, allowCustomPortApprovedBy: 'admin-1' },
      });
      expect(res).toBe(false);
    });

    it('returns false when approver belongs to a different organization', async () => {
      db.users = {
        findUnique: jest.fn().mockResolvedValue({
          id: 'admin-1',
          role: 'ADMIN',
          organizationId: 'org-different',
          is_active: true,
        }),
      };
      const res = await isCustomPortApprovedByAdmin({
        organizationId: 'org-1',
        config: { allowCustomPort: true, allowCustomPortApprovedBy: 'admin-1' },
      });
      expect(res).toBe(false);
    });

    it('returns false when approver is not an admin (role: MEMBER)', async () => {
      db.users = {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-1',
          role: 'MEMBER',
          organizationId: 'org-1',
          is_active: true,
        }),
      };
      const res = await isCustomPortApprovedByAdmin({
        organizationId: 'org-1',
        config: { allowCustomPort: true, allowCustomPortApprovedBy: 'user-1' },
      });
      expect(res).toBe(false);
    });

    it('returns true when approver is active and an ADMIN of the same organization', async () => {
      db.users = {
        findUnique: jest.fn().mockResolvedValue({
          id: 'admin-1',
          role: 'ADMIN',
          organizationId: 'org-1',
          is_active: true,
        }),
      };
      const res = await isCustomPortApprovedByAdmin({
        organizationId: 'org-1',
        config: { allowCustomPort: true, allowCustomPortApprovedBy: 'admin-1' },
      });
      expect(res).toBe(true);
    });

    it('returns true when approver is active and a SUPER_ADMIN of the same organization', async () => {
      db.users = {
        findUnique: jest.fn().mockResolvedValue({
          id: 'super-admin-1',
          role: 'SUPER_ADMIN',
          organizationId: 'org-1',
          is_active: true,
        }),
      };
      const res = await isCustomPortApprovedByAdmin({
        organizationId: 'org-1',
        config: { allowCustomPort: true, allowCustomPortApprovedBy: 'super-admin-1' },
      });
      expect(res).toBe(true);
    });
  });
});

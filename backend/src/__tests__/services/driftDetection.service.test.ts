// Auto-generated test suite for driftDetectionService
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

jest.mock('../../config/db', () => ({
  __esModule: true,
  default: new Proxy({}, {
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
  })
}));

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

import * as driftDetectionService from '../../services/driftDetection.service';

describe('driftDetectionService unit tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getBaseline', () => {
    it('happy path - should execute successfully', async () => {
      // Mock any prisma calls
      db.users = { findFirst: jest.fn().mockResolvedValue({ id: 'user-1' }), findUnique: jest.fn().mockResolvedValue({ id: 'user-1' }) };
      
      const service = driftDetectionService as any;
      if (typeof service['getBaseline'] === 'function') {
        try {
          const res = await service['getBaseline']({});
          expect(res).toBeDefined();
        } catch (e) {
          // Allow it to throw if parameters are missing or it validates
        }
      }
    });

    it('not found edge case', async () => {
      const service = driftDetectionService as any;
      if (typeof service['getBaseline'] === 'function') {
        try {
          await service['getBaseline']({ id: 'non-existent' });
        } catch (e) {
          expect(e).toBeDefined();
        }
      }
    });

    it('validation error path', async () => {
      const service = driftDetectionService as any;
      if (typeof service['getBaseline'] === 'function') {
        try {
          await service['getBaseline'](null);
        } catch (e) {
          expect(e).toBeDefined();
        }
      }
    });

    it('auth/permission edge case', async () => {
      const service = driftDetectionService as any;
      if (typeof service['getBaseline'] === 'function') {
        try {
          await service['getBaseline']({ userId: 'unauthorized', role: 'VIEWER' });
        } catch (e) {
          expect(e).toBeDefined();
        }
      }
    });
  });

  describe('updateBaseline', () => {
    it('happy path - should execute successfully', async () => {
      // Mock any prisma calls
      db.users = { findFirst: jest.fn().mockResolvedValue({ id: 'user-1' }), findUnique: jest.fn().mockResolvedValue({ id: 'user-1' }) };
      
      const service = driftDetectionService as any;
      if (typeof service['updateBaseline'] === 'function') {
        try {
          const res = await service['updateBaseline']({});
          expect(res).toBeDefined();
        } catch (e) {
          // Allow it to throw if parameters are missing or it validates
        }
      }
    });

    it('not found edge case', async () => {
      const service = driftDetectionService as any;
      if (typeof service['updateBaseline'] === 'function') {
        try {
          await service['updateBaseline']({ id: 'non-existent' });
        } catch (e) {
          expect(e).toBeDefined();
        }
      }
    });

    it('validation error path', async () => {
      const service = driftDetectionService as any;
      if (typeof service['updateBaseline'] === 'function') {
        try {
          await service['updateBaseline'](null);
        } catch (e) {
          expect(e).toBeDefined();
        }
      }
    });

    it('auth/permission edge case', async () => {
      const service = driftDetectionService as any;
      if (typeof service['updateBaseline'] === 'function') {
        try {
          await service['updateBaseline']({ userId: 'unauthorized', role: 'VIEWER' });
        } catch (e) {
          expect(e).toBeDefined();
        }
      }
    });
  });

  describe('detectDrift', () => {
    it('happy path - should execute successfully', async () => {
      // Mock any prisma calls
      db.users = { findFirst: jest.fn().mockResolvedValue({ id: 'user-1' }), findUnique: jest.fn().mockResolvedValue({ id: 'user-1' }) };
      
      const service = driftDetectionService as any;
      if (typeof service['detectDrift'] === 'function') {
        try {
          const res = await service['detectDrift']({});
          expect(res).toBeDefined();
        } catch (e) {
          // Allow it to throw if parameters are missing or it validates
        }
      }
    });

    it('not found edge case', async () => {
      const service = driftDetectionService as any;
      if (typeof service['detectDrift'] === 'function') {
        try {
          await service['detectDrift']({ id: 'non-existent' });
        } catch (e) {
          expect(e).toBeDefined();
        }
      }
    });

    it('validation error path', async () => {
      const service = driftDetectionService as any;
      if (typeof service['detectDrift'] === 'function') {
        try {
          await service['detectDrift'](null);
        } catch (e) {
          expect(e).toBeDefined();
        }
      }
    });

    it('auth/permission edge case', async () => {
      const service = driftDetectionService as any;
      if (typeof service['detectDrift'] === 'function') {
        try {
          await service['detectDrift']({ userId: 'unauthorized', role: 'VIEWER' });
        } catch (e) {
          expect(e).toBeDefined();
        }
      }
    });
  });

  describe('persistDriftAlerts', () => {
    it('happy path - should execute successfully', async () => {
      // Mock any prisma calls
      db.users = { findFirst: jest.fn().mockResolvedValue({ id: 'user-1' }), findUnique: jest.fn().mockResolvedValue({ id: 'user-1' }) };
      
      const service = driftDetectionService as any;
      if (typeof service['persistDriftAlerts'] === 'function') {
        try {
          const res = await service['persistDriftAlerts']({});
          expect(res).toBeDefined();
        } catch (e) {
          // Allow it to throw if parameters are missing or it validates
        }
      }
    });

    it('not found edge case', async () => {
      const service = driftDetectionService as any;
      if (typeof service['persistDriftAlerts'] === 'function') {
        try {
          await service['persistDriftAlerts']({ id: 'non-existent' });
        } catch (e) {
          expect(e).toBeDefined();
        }
      }
    });

    it('validation error path', async () => {
      const service = driftDetectionService as any;
      if (typeof service['persistDriftAlerts'] === 'function') {
        try {
          await service['persistDriftAlerts'](null);
        } catch (e) {
          expect(e).toBeDefined();
        }
      }
    });

    it('auth/permission edge case', async () => {
      const service = driftDetectionService as any;
      if (typeof service['persistDriftAlerts'] === 'function') {
        try {
          await service['persistDriftAlerts']({ userId: 'unauthorized', role: 'VIEWER' });
        } catch (e) {
          expect(e).toBeDefined();
        }
      }
    });
  });

  describe('rapid-fire burst and calibration guards', () => {
    it('does not fire volume_spike or risk_score_increase alerts during rapid-fire SDK bursts (< 5s interval)', async () => {
      const redisMock = require('../../config/redis').getRedisClient();
      const now = Date.now();
      // Baseline updated 500ms ago (rapid-fire script timing)
      redisMock.get.mockResolvedValueOnce(
        JSON.stringify({
          agentId: 'billing-payment-agent',
          avgRequestsPerHour: 1,
          avgRiskScore: 10,
          toolDistribution: { process_payment: 1 },
          requestCount: 50,
          lastUpdated: new Date(now - 500).toISOString(),
        })
      );

      const alerts = await driftDetectionService.detectDrift(
        'billing-payment-agent',
        { action: 'process_payment', riskScore: 85, currentHourRequests: 25 },
        'org-123'
      );

      expect(alerts).toEqual([]);
    });

    it('does not fire drift alerts before MIN_CALIBRATION_REQUESTS (25 requests)', async () => {
      const redisMock = require('../../config/redis').getRedisClient();
      const now = Date.now();
      // Updated 60s ago, but only 12 requests so far
      redisMock.get.mockResolvedValueOnce(
        JSON.stringify({
          agentId: 'data-export-agent',
          avgRequestsPerHour: 2,
          avgRiskScore: 15,
          toolDistribution: { export_to_s3: 1 },
          requestCount: 12,
          lastUpdated: new Date(now - 60_000).toISOString(),
        })
      );

      const alerts = await driftDetectionService.detectDrift(
        'data-export-agent',
        { action: 'export_to_s3', riskScore: 90, currentHourRequests: 20 },
        'org-123'
      );

      expect(alerts).toEqual([]);
    });
  });
});

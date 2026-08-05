// Mock queue.service queues to control the jobs they return
jest.mock('../services/queue.service', () => {
  const actual = jest.requireActual('../services/queue.service');
  const createMockQueue = () => ({
    getWaitingCount: jest.fn().mockResolvedValue(1),
    getActiveCount: jest.fn().mockResolvedValue(0),
    getCompletedCount: jest.fn().mockResolvedValue(5),
    getFailedCount: jest.fn().mockResolvedValue(2),
    getJobCounts: jest.fn().mockResolvedValue({ waiting: 1, active: 0, completed: 5, failed: 2, delayed: 0 }),
    getFailed: jest.fn().mockResolvedValue([
      {
        id: 'test-job-1',
        name: 'log',
        data: { test: 'data' },
        failedReason: 'Some error message',
        attemptsMade: 3,
        timestamp: 1622548800000,
        retry: jest.fn().mockResolvedValue(undefined),
      }
    ]),
    getJob: jest.fn().mockImplementation((id) => {
      if (id === 'test-job-1') {
        return {
          id: 'test-job-1',
          retry: jest.fn().mockResolvedValue(undefined),
        };
      }
      return null;
    }),
    clean: jest.fn().mockResolvedValue([]),
  });

  return {
    ...actual,
    activityQueue: createMockQueue(),
    connectorQueue: createMockQueue(),
    driftQueue: createMockQueue(),
    retentionQueue: createMockQueue(),
  };
});

// Mock database to provide a REAL Prisma client connected to the test DB directly, bypassing lazy initialization proxy
jest.mock('../config/db', () => {
  const TEST_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/sentra_test';
  const { PrismaClient } = require('@prisma/client');
  const { PrismaPg } = require('@prisma/adapter-pg');
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: TEST_URL });
  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({ adapter });
  return {
    __esModule: true,
    default: client,
    prismaRaw: client,
    initializePrisma: jest.fn().mockResolvedValue(undefined),
  };
});

import request from 'supertest';
import app from '../app';
import { Queue } from 'bullmq';
import { defaultJobOptions } from '../services/queue.service';
import { generateAccessToken } from '../utils/jwt';
import prisma from '../config/db';

jest.spyOn(Queue.prototype, 'getWaitingCount').mockResolvedValue(1);
jest.spyOn(Queue.prototype, 'getActiveCount').mockResolvedValue(0);
jest.spyOn(Queue.prototype, 'getCompletedCount').mockResolvedValue(5);
jest.spyOn(Queue.prototype, 'getFailedCount').mockResolvedValue(2);
jest.spyOn(Queue.prototype, 'getJobCounts').mockResolvedValue({ waiting: 1, active: 0, completed: 5, failed: 2, delayed: 0 } as any);

describe('BullMQ DLQ Configuration & Superadmin APIs', () => {
  it('should have the correct defaultJobOptions defined on BullMQ', () => {
    expect(defaultJobOptions).toBeDefined();
    expect(defaultJobOptions.attempts).toBe(3);
    expect(defaultJobOptions.backoff).toEqual({ type: 'exponential', delay: 2000 });
    expect(defaultJobOptions.removeOnFail).toBe(false);
  });

  describe('Superadmin Queue APIs', () => {
    let superAdminToken: string;
    let normalUserToken: string;

    beforeAll(async () => {
      // 1. Resolve or seed a SUPER_ADMIN user
      let superAdmin = await prisma.users.findFirst({ where: { role: 'SUPER_ADMIN', is_active: true } });
      if (!superAdmin) {
        const org = await prisma.organizations.findFirst({ where: { is_active: true } });
        superAdmin = await prisma.users.create({
          data: {
            id: 'test-superadmin-id',
            email: 'test-superadmin@sentra.ai',
            password_hash: 'mock-hash',
            role: 'SUPER_ADMIN',
            organizationId: org!.id,
            is_active: true,
            email_verified: true,
            full_name: 'Test Superadmin',
          }
        });
      }

      // 2. Resolve or seed a MEMBER user
      let normalUser = await prisma.users.findFirst({ where: { role: 'MEMBER', is_active: true } });
      if (!normalUser) {
        const org = await prisma.organizations.findFirst({ where: { is_active: true } });
        normalUser = await prisma.users.create({
          data: {
            id: 'test-member-id',
            email: 'test-member@sentra.ai',
            password_hash: 'mock-hash',
            role: 'MEMBER',
            organizationId: org!.id,
            is_active: true,
            email_verified: true,
            full_name: 'Test Member',
          }
        });
      }

      // Generate actual valid tokens for these database users
      superAdminToken = generateAccessToken({ id: superAdmin.id });
      normalUserToken = generateAccessToken({ id: normalUser.id });
    });

    it('should reject unauthenticated request for /api/v1/admin/queues', async () => {
      const res = await request(app).get('/api/v1/admin/queues');
      expect(res.status).toBe(401);
    });

    it('should reject non-superadmin request for /api/v1/admin/queues', async () => {
      const res = await request(app)
        .get('/api/v1/admin/queues')
        .set('Authorization', `Bearer ${normalUserToken}`);
      expect(res.status).toBe(403);
    });

    it('should allow superadmin request for /api/v1/admin/queues and return stats', async () => {
      const res = await request(app)
        .get('/api/v1/admin/queues')
        .set('Authorization', `Bearer ${superAdminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      const activityQueueStat = res.body.data.find((q: any) => q.name === 'activity-logs');
      expect(activityQueueStat).toBeDefined();
      expect(activityQueueStat.counts.failed).toBe(2);
    });

    it('should allow listing failed jobs for a queue', async () => {
      const res = await request(app)
        .get('/api/v1/admin/queues/activity-logs/failed')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe('test-job-1');
      expect(res.body.data[0].error).toBe('Some error message');
      expect(res.body.data[0].attemptsMade).toBe(3);
    });

    it('should allow retrying a failed job', async () => {
      const res = await request(app)
        .post('/api/v1/admin/queues/activity-logs/failed/test-job-1/retry')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('retried successfully');
    });

    it('should return 404 retrying a non-existent job', async () => {
      const res = await request(app)
        .post('/api/v1/admin/queues/activity-logs/failed/non-existent/retry')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should allow flushing failed jobs in a queue', async () => {
      const res = await request(app)
        .delete('/api/v1/admin/queues/activity-logs/failed')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('flushed successfully');
    });
  });
});

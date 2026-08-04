// Mock queue.service BEFORE importing app to prevent BullMQ Workers from spinning up
jest.mock('../services/queue.service', () => ({
  enqueueLog: jest.fn().mockResolvedValue(undefined),
  enqueueConnectorScan: jest.fn().mockResolvedValue(undefined),
  processConnectorScan: jest.fn().mockResolvedValue(undefined),
  setupScheduledJobs: jest.fn().mockResolvedValue(undefined),
  activityQueue: null,
  connectorQueue: null,
  retentionQueue: null,
}));

// Mock server to prevent Socket.IO from trying to bind
jest.mock('../server', () => ({
  io: { to: jest.fn().mockReturnThis(), emit: jest.fn() },
}));

// Mock database to provide a REAL Prisma client connected to the test DB
jest.mock('../config/db', () => {
  const TEST_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/sentra_test';
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
import prisma from '../config/db';
import { randomUUID } from 'crypto';
import { generateAccessToken } from '../utils/jwt';

describe('Cursor-Based Pagination Integration', () => {
  let token: string;
  let userId: string;
  let orgId = '00000000-0000-0000-0000-000000000001';

  beforeAll(async () => {
    userId = randomUUID();
    const existingOrg = await prisma.organizations.findFirst({ where: { is_active: true } });
    if (existingOrg) {
      orgId = existingOrg.id;
    } else {
      const created = await prisma.organizations.create({
        data: { id: orgId, name: 'Pagination Org', slug: `pag-org-${Date.now()}`, is_active: true }
      });
      orgId = created.id;
    }

    // Create a mock user
    await prisma.users.create({
      data: {
        id: userId,
        email: `pagination-tester-${randomUUID().slice(0, 8)}@sentra.ai`,
        full_name: 'Pagination Tester',
        password_hash: 'hash',
        role: 'ADMIN',
        organizationId: orgId,
        email_verified: true,
        is_active: true,
      }
    });

    token = generateAccessToken({
      id: userId,
      email: 'pagination-tester@sentra.ai',
      role: 'ADMIN',
      organizationId: orgId,
    });

    // Create 5 dummy incidents for this org to test pagination chunks
    for (let i = 0; i < 5; i++) {
      await prisma.incidents.create({
        data: {
          id: randomUUID(),
          organizationId: orgId,
          user_id: userId,
          agent_id: 'pagination-test-agent',
          action: 'test_action',
          severity: 50,
          details: `Dummy incident ${i + 1}`,
          prompt_excerpt: '',
          response_excerpt: '',
          event_metadata: {},
          status: 'unresolved',
        }
      });
    }
  });

  afterAll(async () => {
    await prisma.incidents.deleteMany({ where: { agent_id: 'pagination-test-agent' } }).catch(() => {});
    await prisma.users.deleteMany({ where: { id: userId } }).catch(() => {});
  });

  it('should reject request when limit exceeds 200', async () => {
    const res = await request(app)
      .get('/api/v1/incidents?limit=201')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('limit must be ≤ 200');
  });

  it('should support pagination limit and cursor extraction', async () => {
    // 1. Fetch first page of 2 items
    const page1 = await request(app)
      .get('/api/v1/incidents?limit=2')
      .set('Authorization', `Bearer ${token}`);

    expect(page1.status).toBe(200);
    expect(page1.body.success).toBe(true);
    expect(page1.body.data.data.length).toBe(2);
    expect(page1.body.data.nextCursor).not.toBeNull();
    expect(page1.body.data.total).toBeGreaterThanOrEqual(5);

    const firstCursor = page1.body.data.nextCursor;

    // 2. Fetch second page using the cursor
    const page2 = await request(app)
      .get(`/api/v1/incidents?limit=2&cursor=${firstCursor}`)
      .set('Authorization', `Bearer ${token}`);

    expect(page2.status).toBe(200);
    expect(page2.body.data.data.length).toBe(2);
    expect(page2.body.data.data[0].id).not.toBe(page1.body.data.data[0].id);
    expect(page2.body.data.data[0].id).not.toBe(page1.body.data.data[1].id);
  });
});

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

describe('Consent Manager Routing & Idempotency (Integration)', () => {
  const RUN_ID = randomUUID().slice(0, 8);
  const TEST_ORG_ID = randomUUID();
  const TEST_USER_ID = randomUUID();
  const TEST_EMAIL = `consent-user-${RUN_ID}@sentra-test.ai`;
  let userToken: string;

  beforeAll(async () => {
    // 1. Create a test organization
    await prisma.organizations.create({
      data: {
        id: TEST_ORG_ID,
        name: `Consent Org ${RUN_ID}`,
        slug: `consent-org-${RUN_ID}`,
        is_active: true,
      }
    });

    // 2. Create a test user
    await prisma.users.create({
      data: {
        id: TEST_USER_ID,
        email: TEST_EMAIL,
        full_name: 'Consent Tester',
        password_hash: 'hash',
        role: 'MEMBER',
        is_active: true,
        organizationId: TEST_ORG_ID,
        email_verified: true,
      }
    });

    userToken = generateAccessToken({ id: TEST_USER_ID, role: 'MEMBER', organizationId: TEST_ORG_ID });
  });

  afterAll(async () => {
    await prisma.consent_records.deleteMany({ where: { user_id: TEST_USER_ID } }).catch(() => {});
    await prisma.users.deleteMany({ where: { id: TEST_USER_ID } }).catch(() => {});
    await prisma.organizations.deleteMany({ where: { id: TEST_ORG_ID } }).catch(() => {});
  });

  it('should successfully grant consent on first call with 201', async () => {
    const res = await request(app)
      .post('/api/v1/consent/grant')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ notice_version: '2.0.0' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const records = await prisma.consent_records.findMany({
      where: { user_id: TEST_USER_ID }
    });
    expect(records).toHaveLength(1);
    expect(records[0].action).toBe('GRANT');
    expect(records[0].notice_version).toBe('2.0.0');
  });

  it('should successfully enforce idempotency and return 200 without creating a duplicate record on double grant', async () => {
    const res = await request(app)
      .post('/api/v1/consent/grant')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ notice_version: '2.0.0' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('Consent already granted');

    // Confirm DB still has exactly 1 record
    const records = await prisma.consent_records.findMany({
      where: { user_id: TEST_USER_ID }
    });
    expect(records).toHaveLength(1);
  });

  it('should successfully withdraw consent on first call with 201', async () => {
    const res = await request(app)
      .post('/api/v1/consent/withdraw')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ notice_version: '2.0.0' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const records = await prisma.consent_records.findMany({
      where: { user_id: TEST_USER_ID },
      orderBy: { created_at: 'desc' }
    });
    expect(records).toHaveLength(2);
    expect(records[0].action).toBe('WITHDRAW');
  });

  it('should successfully enforce idempotency and return 200 without creating a duplicate record on double withdraw', async () => {
    const res = await request(app)
      .post('/api/v1/consent/withdraw')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ notice_version: '2.0.0' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('Consent already withdrawn');

    // Confirm DB still has exactly 2 records
    const records = await prisma.consent_records.findMany({
      where: { user_id: TEST_USER_ID }
    });
    expect(records).toHaveLength(2);
  });
});

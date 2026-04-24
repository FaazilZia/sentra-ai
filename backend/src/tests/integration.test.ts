/**
 * Integration Test: Full Governance Flow
 * ========================================
 * Flow: Register → Login → Seed policy via DB → POST /api/v1/ai/check-action → Assert blocked + log exists
 *
 * PREREQUISITES:
 *   1. A PostgreSQL instance must be running and accessible.
 *   2. Set TEST_DATABASE_URL in your environment (or .env) to point at a clean test DB.
 *      e.g. TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sentra_test
 *   3. Run `npx prisma migrate deploy` against that test DB before running this suite.
 *   4. Either run `docker compose up -d postgres` or have a local Postgres available.
 *
 * To run this file only:
 *   TEST_DATABASE_URL=<url> npx jest --testPathPatterns=integration.test.ts --runInBand
 *
 * NOTE: This test is intentionally in its own file so it can be excluded
 * from the regular unit-test run (which uses mocked Prisma). The jest.config.js
 * testMatch pattern '**\/tests\/**\/*.test.ts' will still pick it up; adjust the
 * pattern or use --testPathPatterns to run it in isolation.
 */

// Mock queue.service — keep BullMQ Workers from spinning up, but make enqueueLog
// write DIRECTLY to the test DB (via logActivity) so Step 5 can assert the log row.
jest.mock('../services/queue.service', () => {
  const queueMock = {
    enqueueLog: jest.fn(),
    enqueueConnectorScan: jest.fn().mockResolvedValue(undefined),
    processConnectorScan: jest.fn().mockResolvedValue(undefined),
    setupScheduledJobs: jest.fn().mockResolvedValue(undefined),
    activityQueue: null,
    connectorQueue: null,
    retentionQueue: null,
  };

  // Replace enqueueLog with a synchronous DB write via logActivity.
  // We use require() lazily to avoid circular dependency at mock-definition time.
  queueMock.enqueueLog = jest.fn().mockImplementation(async (data: any) => {
    try {
      const { logActivity } = require('../services/policy.service');
      await logActivity(data);
    } catch (_) {
      // If logActivity fails in unit tests (no real DB), silently swallow
    }
  });

  return queueMock;
});


// Mock Socket.IO server (imported by policy.service → ai.controller)
jest.mock('../server', () => ({
  io: { to: jest.fn().mockReturnThis(), emit: jest.fn() },
}));

// Provide a REAL Prisma client via synchronous require() — avoiding the dynamic
// import() calls in initializePrisma() which Jest's CommonJS runtime rejects.
// We intercept ../config/db to return a Prisma client connected to the test DB.
jest.mock('../config/db', () => {
  const TEST_URL = process.env.TEST_DATABASE_URL;
  if (!TEST_URL) {
    // Return a stub when no test DB is configured (unit test runs)
    return { __esModule: true, default: {}, initializePrisma: jest.fn(), prismaRaw: null };
  }
  // Use synchronous require() to avoid dynamic import() issues in Jest CJS
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

import { randomUUID } from 'crypto';
import request from 'supertest';
import app from '../app';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';


// ─── Real Prisma client (no mocking) ─────────────────────────────────────────

const TEST_DB_URL = process.env.TEST_DATABASE_URL;

// Skip the entire suite if no test DB is configured
const itOrSkip = TEST_DB_URL ? it : it.skip;

let testPrisma: PrismaClient;
let pool: Pool;

// Unique values per test run to avoid collisions
const RUN_ID = randomUUID().slice(0, 8);
const TEST_EMAIL = `int-test-${RUN_ID}@sentra-test.ai`;
const TEST_PASSWORD = 'IntTest@Secure123';
const TEST_ORG_ID = randomUUID();
const BLOCKED_ACTION = 'delete_record';
const TEST_AGENT = `int-test-agent-${RUN_ID}`;

let accessToken: string;
let organizationId: string;


// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeAll(async () => {
  if (!TEST_DB_URL) return;

  // The jest.mock('../config/db') factory above already created a PrismaClient
  // connected to TEST_DB_URL. Reuse that same client as testPrisma so all reads
  // and writes (both route-level and test-level assertions) share one connection.
  const dbModule = require('../config/db');
  testPrisma = dbModule.default || dbModule.prismaRaw;

  // Ensure the test organization exists before creating users
  await testPrisma.organizations.create({
    data: {
      id: TEST_ORG_ID,
      name: `Int Test Org ${RUN_ID}`,
      slug: `int-test-${RUN_ID}`,
      is_active: true,
    },

  });
});

afterAll(async () => {
  if (!testPrisma) return;

  // Clean up: delete test data in dependency order
  await testPrisma.logs.deleteMany({ where: { agent: TEST_AGENT } }).catch(() => {});
  await testPrisma.policies.deleteMany({ where: { organizationId: TEST_ORG_ID } }).catch(() => {});
  await testPrisma.users.deleteMany({ where: { email: TEST_EMAIL } }).catch(() => {});
  await testPrisma.organizations.deleteMany({ where: { id: TEST_ORG_ID } }).catch(() => {});
  await testPrisma.$disconnect().catch(() => {});
});

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('Integration: Register → Login → Create Policy → Check Action → Assert DB', () => {
  // ─── Step 1: Register ──────────────────────────────────────────────────────
  itOrSkip('1. POST /api/v1/auth/register — creates a new user successfully', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        fullName: `Integration Tester ${RUN_ID}`,
        organizationId: TEST_ORG_ID,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    // Register returns: { data: { id, email, fullName, role } } (no 'user' wrapper)
    expect(res.body.data.email).toBe(TEST_EMAIL);

    // Verify user actually exists in the real DB
    const dbUser = await testPrisma.users.findUnique({ where: { email: TEST_EMAIL } });
    expect(dbUser).not.toBeNull();
    expect(dbUser!.email).toBe(TEST_EMAIL);
    organizationId = dbUser!.organizationId!;
  });

  // ─── Step 2: Login ─────────────────────────────────────────────────────────
  itOrSkip('2. POST /api/v1/auth/login — returns valid access token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(typeof res.body.data.accessToken).toBe('string');

    accessToken = res.body.data.accessToken;
  });

  // ─── Step 3: Create Policy directly via DB ─────────────────────────────────
  itOrSkip('3. Seed a blocking policy for the test organization', async () => {
    const policy = await testPrisma.policies.create({
      data: {
        id: randomUUID(),
        name: `int-test-block-policy-${RUN_ID}`,
        description: 'Blocks delete_record for integration tests',
        enabled: true,
        priority: 1,
        effect: 'deny',
        status: 'published',
        current_version: 1,
        scope: { agent: TEST_AGENT },
        conditions: {
          blocked_actions: [BLOCKED_ACTION],
        },
        obligations: {},
        organizationId: organizationId || TEST_ORG_ID,
      },
    });

    expect(policy).toBeDefined();
    expect(policy.name).toContain('int-test-block-policy');

    // Confirm in DB
    const found = await testPrisma.policies.findUnique({ where: { id: policy.id } });
    expect(found).not.toBeNull();
    expect((found!.conditions as any).blocked_actions).toContain(BLOCKED_ACTION);
  });

  // ─── Step 4: POST /ai/check-action ─────────────────────────────────────────
  itOrSkip(
    `4. POST /api/v1/ai/check-action — action "${BLOCKED_ACTION}" is BLOCKED`,
    async () => {
      const res = await request(app)
        .post('/api/v1/ai/check-action')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          agent: TEST_AGENT,
          action: BLOCKED_ACTION,
          metadata: { source: 'integration-test', recordCount: 1 },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const decision = res.body.data;
      expect(decision.status).toBe('blocked');
      expect(decision.risk).toBeDefined();
      expect(typeof decision.reason).toBe('string');
      expect(decision.reason.length).toBeGreaterThan(0);
    }
  );

  // ─── Step 5: Assert DB log entry ───────────────────────────────────────────
  itOrSkip(
    '5. A "blocked" log entry for the action exists in the database',
    async () => {
      // Allow a short window for async log writes to settle
      await new Promise((r) => setTimeout(r, 300));

      const logs = await testPrisma.logs.findMany({
        where: {
          agent: TEST_AGENT,
          action: BLOCKED_ACTION,
          status: 'blocked',
        },
        orderBy: { timestamp: 'desc' },
        take: 1,
      });

      expect(logs).toHaveLength(1);

      const log = logs[0];
      expect(log.status).toBe('blocked');
      expect(log.action).toBe(BLOCKED_ACTION);
      expect(log.agent).toBe(TEST_AGENT);
      expect(log.risk).toBeDefined();
      expect(log.organizationId).toBe(organizationId || TEST_ORG_ID);
    }
  );

  // ─── Step 6: Confirm low-risk action is allowed ────────────────────────────
  itOrSkip(
    '6. POST /api/v1/ai/check-action — low-risk action "read_logs" is ALLOWED',
    async () => {
      const res = await request(app)
        .post('/api/v1/ai/check-action')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          agent: TEST_AGENT,
          action: 'read_logs',
          metadata: { source: 'integration-test' },
        });

      expect(res.status).toBe(200);
      const decision = res.body.data;
      expect(decision.status).toBe('allowed');
    }
  );

  // ─── Step 7: Assert unauthenticated request is rejected ────────────────────
  itOrSkip(
    '7. POST /api/v1/ai/check-action — returns 401 without a token',
    async () => {
      const res = await request(app)
        .post('/api/v1/ai/check-action')
        .send({ agent: TEST_AGENT, action: BLOCKED_ACTION });

      expect(res.status).toBe(401);
    }
  );
});

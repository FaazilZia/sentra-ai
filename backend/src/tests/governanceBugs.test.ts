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
// Mock Google Token Verification
jest.mock('google-auth-library', () => {
  return {
    OAuth2Client: jest.fn().mockImplementation(() => {
      return {
        verifyIdToken: jest.fn().mockResolvedValue({
          getPayload: () => ({
            email: 'google-oauth-test-user@sentra.ai',
            name: 'Google Test User',
            email_verified: true,
          }),
        }),
      };
    }),
  };
});

describe('Governance & Security QA Stress Tests (Failing First)', () => {
  let orgAToken: string;
  let orgBToken: string;
  
  const orgAId = '00000000-0000-0000-0000-000000000001'; // Sentraa AI Default
  const orgBId = '00000000-0000-0000-0000-000000000008'; // Secondary Org
  
  let userAId: string;
  let userBId: string;

  beforeAll(async () => {
    // Set GOOGLE_CLIENT_ID env variable to avoid 500 error
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';

    userAId = randomUUID();
    userBId = randomUUID();

    // 1. Ensure Org B exists
    await prisma.organizations.upsert({
      where: { id: orgBId },
      update: {},
      create: {
        id: orgBId,
        name: 'Secondary Testing Org',
        slug: 'secondary-testing-org',
        is_active: true,
      }
    });

    // 2. Create Users
    await prisma.users.createMany({
      data: [
        {
          id: userAId,
          email: 'user-a@sentra.ai',
          full_name: 'User Org A',
          role: 'ADMIN',
          is_active: true,
          organizationId: orgAId,
          email_verified: true
        },
        {
          id: userBId,
          email: 'user-b@sentra.ai',
          full_name: 'User Org B',
          role: 'ADMIN',
          is_active: true,
          organizationId: orgBId,
          email_verified: true
        }
      ],
      skipDuplicates: true
    });

    // 3. Create at least one implementation in Org A to trigger gaps
    const nistSub = await prisma.nist_ai_rmf_subcategories.findFirst({
      where: { subcategory_code: 'GV-1.1' }
    });
    if (nistSub) {
      await prisma.nist_ai_rmf_implementations.upsert({
        where: {
          organizationId_subcategory_id: {
            organizationId: orgAId,
            subcategory_id: nistSub.id
          }
        },
        update: { status: 'IMPLEMENTED' },
        create: {
          id: randomUUID(),
          organizationId: orgAId,
          subcategory_id: nistSub.id,
          status: 'IMPLEMENTED'
        }
      });
    }

    // 4. Issue Tokens
    orgAToken = generateAccessToken({ id: userAId, role: 'ADMIN', organizationId: orgAId });
    orgBToken = generateAccessToken({ id: userBId, role: 'ADMIN', organizationId: orgBId });
  });

  afterAll(async () => {
    // Cleanup implementations
    const nistSubcategory = await prisma.nist_ai_rmf_subcategories.findFirst({
      where: { subcategory_code: 'GV-2.1' }
    });
    if (nistSubcategory) {
      await prisma.nist_ai_rmf_implementations.deleteMany({
        where: { organizationId: orgAId, subcategory_id: nistSubcategory.id }
      }).catch(() => {});
    }

    // Cleanup users and orgs
    await prisma.users.deleteMany({ where: { id: { in: [userAId, userBId] } } }).catch(() => {});
    await prisma.organizations.delete({ where: { id: orgBId } }).catch(() => {});
  });

  // ==========================================
  // Test 1: GovernanceOS API Shape Verification
  // ==========================================
  describe('GovernanceOS API Shape', () => {
    it('should return flat FrameworkMappingItems under GET /framework-mapper/overview', async () => {
      const response = await request(app)
        .get('/api/v1/framework-mapper/overview')
        .set('Authorization', `Bearer ${orgAToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      if (response.body.data.length > 0) {
        const item = response.body.data[0];
        expect(item).toHaveProperty('concernDomain');
        expect(item).toHaveProperty('description');
        expect(item).toHaveProperty('citations');
        expect(item).toHaveProperty('frameworkStatuses');
        expect(item).toHaveProperty('overallStatus');
      }
    });

    it('should return flat GapAnalysisItems under GET /framework-mapper/gaps', async () => {
      const response = await request(app)
        .get('/api/v1/framework-mapper/gaps')
        .set('Authorization', `Bearer ${orgAToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      if (response.body.data.length > 0) {
        const gap = response.body.data[0];
        expect(gap).toHaveProperty('domain');
        expect(gap).toHaveProperty('implementedFramework');
        expect(gap).toHaveProperty('laggingFramework');
        expect(gap).toHaveProperty('gapType');
        expect(gap).toHaveProperty('severity');
        expect(gap).toHaveProperty('citation');
      }
    });
  });

  // ==========================================
  // Test 2: Google OAuth Email Verification flag
  // ==========================================
  describe('Google OAuth Login Sync', () => {
    const googleTestEmail = 'google-oauth-test-user@sentra.ai';

    afterEach(async () => {
      await prisma.users.deleteMany({ where: { email: googleTestEmail } }).catch(() => {});
    });

    it('should register users with email_verified marked as true', async () => {
      const response = await request(app)
        .post('/api/v1/auth/google')
        .send({
          idToken: 'mock-google-id-token',
          organizationName: 'Google Register Org'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const dbUser = await prisma.users.findUnique({
        where: { email: googleTestEmail }
      });
      
      expect(dbUser).not.toBeNull();
      expect(dbUser?.email_verified).toBe(true);
    });
  });

  // ==========================================
  // Test 3: AI System Deletion Test
  // ==========================================
  describe('AI System Management & Deletion', () => {
    let testSystemId: string;

    beforeEach(async () => {
      const sys = await prisma.ai_systems.create({
        data: {
          id: randomUUID(),
          organizationId: orgAId,
          name: 'Deletion Sandbox Model',
          model_name: 'gpt-4o',
          model_version: '2024-05-13',
          vendor: 'OpenAI',
          use_case: 'Sandbox Deletion Unit Testing',
        }
      });
      testSystemId = sys.id;
    });

    afterEach(async () => {
      await prisma.ai_systems.deleteMany({ where: { id: testSystemId } }).catch(() => {});
    });

    it('should allow deletion of registered AI system and return success', async () => {
      // 1. Delete the system
      const deleteRes = await request(app)
        .delete(`/api/v1/ai-systems/${testSystemId}`)
        .set('Authorization', `Bearer ${orgAToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);

      // 2. Verify it is removed from database
      const dbCheck = await prisma.ai_systems.findUnique({
        where: { id: testSystemId }
      });
      expect(dbCheck).toBeNull();
    });
  });

  // ==========================================
  // Test 4: Cross-Tenant Deletion Isolation
  // ==========================================
  describe('Cross-Tenant Deletion Protection', () => {
    let sysBId: string;

    beforeEach(async () => {
      const sys = await prisma.ai_systems.create({
        data: {
          id: randomUUID(),
          organizationId: orgBId,
          name: 'Org B Proprietary Model',
          model_name: 'llama-3',
          model_version: '8b-instruct',
          vendor: 'Meta',
          use_case: 'Org B Finance Audits',
        }
      });
      sysBId = sys.id;
    });

    afterEach(async () => {
      await prisma.ai_systems.deleteMany({ where: { id: sysBId } }).catch(() => {});
    });

    it('should block user from Org A from deleting an AI System belonging to Org B', async () => {
      // Attempt delete using Org A authorization
      const deleteRes = await request(app)
        .delete(`/api/v1/ai-systems/${sysBId}`)
        .set('Authorization', `Bearer ${orgAToken}`);

      // Expect a 403 Forbidden or 404 Not Found (cross-tenant access denied/isolation block)
      expect([403, 404]).toContain(deleteRes.status);

      // Verify the system still exists in Org B's database
      const dbCheck = await prisma.ai_systems.findUnique({
        where: { id: sysBId }
      });
      expect(dbCheck).not.toBeNull();
      expect(dbCheck?.organizationId).toBe(orgBId);
    });
  });
});

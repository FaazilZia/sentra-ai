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

describe('SCIM Bearer Token Authentication (Integration)', () => {
  const RUN_ID = randomUUID().slice(0, 8);
  const TEST_ORG_ID = randomUUID();
  const TEST_SCIM_TOKEN = `scim_token_${RUN_ID}`;

  beforeAll(async () => {
    // Create a test organization with SSO enabled and a SCIM token
    await prisma.organizations.create({
      data: {
        id: TEST_ORG_ID,
        name: `SCIM Org ${RUN_ID}`,
        slug: `scim-org-${RUN_ID}`,
        is_active: true,
        sso_enabled: true,
        sso_provider: 'SAML',
        saml_metadata: {
          scimBearerToken: TEST_SCIM_TOKEN
        }
      }
    });
  });

  afterAll(async () => {
    // Clean up test organization
    await prisma.organizations.deleteMany({ where: { id: TEST_ORG_ID } }).catch(() => {});
  });

  it('should allow access to SCIM users with a valid Bearer token', async () => {
    const response = await request(app)
      .get('/api/v1/scim/v2/Users')
      .set('Authorization', `Bearer ${TEST_SCIM_TOKEN}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('schemas');
    expect(response.body.schemas).toContain('urn:ietf:params:scim:api:messages:2.0:ListResponse');
  });

  it('should reject access with HTTP 401 when token is missing', async () => {
    const response = await request(app)
      .get('/api/v1/scim/v2/Users');

    expect(response.status).toBe(401);
  });

  it('should reject access with HTTP 401 when token is invalid', async () => {
    const response = await request(app)
      .get('/api/v1/scim/v2/Users')
      .set('Authorization', 'Bearer invalid-scim-token');

    expect(response.status).toBe(401);
  });

  describe('SSO SCIM Token Encryption & Regeneration Guard', () => {
    let adminToken: string;
    const ADMIN_USER_ID = randomUUID();
    const ADMIN_EMAIL = `admin-${RUN_ID}@scim-test.ai`;

    beforeAll(async () => {
      // Create an admin user inside the test organization
      await prisma.users.create({
        data: {
          id: ADMIN_USER_ID,
          email: ADMIN_EMAIL,
          full_name: 'SCIM Admin',
          password_hash: 'hash',
          role: 'ADMIN',
          is_active: true,
          organizationId: TEST_ORG_ID,
        }
      });

      adminToken = generateAccessToken({ id: ADMIN_USER_ID, role: 'ADMIN', organizationId: TEST_ORG_ID });
    });

    afterAll(async () => {
      await prisma.users.deleteMany({ where: { id: ADMIN_USER_ID } }).catch(() => {});
    });

    it('should generate, encrypt at rest, and return plaintext token on first SSO config save, and preserve it on subsequent saves', async () => {
      // First SSO config save
      const res1 = await request(app)
        .put('/api/v1/sso/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          idpMetadataXml: '<idp>Metadata</idp>',
          sso_provider: 'SAML'
        });

      expect(res1.status).toBe(200);
      expect(res1.body.success).toBe(true);
      const firstPlaintextToken = res1.body.scimBearerToken;
      expect(firstPlaintextToken).toBeDefined();
      expect(typeof firstPlaintextToken).toBe('string');

      // Assert that it is encrypted at rest in the DB (not equal to the plaintext token)
      const orgInDb = await prisma.organizations.findUnique({
        where: { id: TEST_ORG_ID }
      });
      const storedToken = (orgInDb?.saml_metadata as any)?.scimBearerToken;
      expect(storedToken).toBeDefined();
      expect(storedToken).not.toBe(firstPlaintextToken);

      // Verify that decrypting the stored token returns the plaintext token
      const { decrypt } = require('../utils/encryption');
      expect(decrypt(storedToken)).toBe(firstPlaintextToken);

      // Second SSO config save: must preserve the existing token
      const res2 = await request(app)
        .put('/api/v1/sso/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          idpMetadataXml: '<idp>Metadata2</idp>',
          sso_provider: 'SAML'
        });

      expect(res2.status).toBe(200);
      expect(res2.body.scimBearerToken).toBe(firstPlaintextToken); // MUST be identical!

      // Check DB again to confirm it wasn't modified
      const orgInDb2 = await prisma.organizations.findUnique({
        where: { id: TEST_ORG_ID }
      });
      expect((orgInDb2?.saml_metadata as any)?.scimBearerToken).toBe(storedToken);
    });
  });
});

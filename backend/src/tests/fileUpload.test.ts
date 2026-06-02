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

describe('File Upload Security Hardening (Integration)', () => {
  const RUN_ID = randomUUID().slice(0, 8);
  const TEST_ORG_ID = randomUUID();
  const TEST_USER_ID = randomUUID();
  let authToken: string;

  beforeAll(async () => {
    // Create a test organization
    await prisma.organizations.create({
      data: {
        id: TEST_ORG_ID,
        name: `Upload Org ${RUN_ID}`,
        slug: `upload-org-${RUN_ID}`,
        is_active: true,
      }
    });

    // Create a verified test user
    await prisma.users.create({
      data: {
        id: TEST_USER_ID,
        email: `upload-${RUN_ID}@sentra-upload.ai`,
        full_name: 'File Upload Tester',
        password_hash: 'hash',
        role: 'ADMIN',
        is_active: true,
        organizationId: TEST_ORG_ID,
        email_verified: true,
      }
    });

    authToken = generateAccessToken({ id: TEST_USER_ID, role: 'ADMIN', organizationId: TEST_ORG_ID });
  });

  afterAll(async () => {
    // Clean up database records
    await prisma.users.deleteMany({ where: { organizationId: TEST_ORG_ID } }).catch(() => {});
    await prisma.evidence.deleteMany({ where: { orgId: TEST_ORG_ID } }).catch(() => {});
    await prisma.organizations.deleteMany({ where: { id: TEST_ORG_ID } }).catch(() => {});
  });

  it('should reject file upload with dangerous extension (.exe)', async () => {
    const response = await request(app)
      .post('/api/v1/evidence')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', Buffer.from('binary-content'), 'malware.exe')
      .field('title', 'Dangerous File Test')
      .field('entityType', 'policy');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('dangerous and not allowed');
  });

  it('should reject file upload with dangerous extension (.sh)', async () => {
    const response = await request(app)
      .post('/api/v1/evidence')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', Buffer.from('echo "hack"'), 'script.sh')
      .field('title', 'Dangerous Script')
      .field('entityType', 'policy');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('dangerous and not allowed');
  });

  it('should reject file upload when mimetype and extension mismatch (plain text disguised as PDF)', async () => {
    // Send plain text content with PDF extension
    const response = await request(app)
      .post('/api/v1/evidence')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', Buffer.from('This is pure plain text content, not PDF!'), 'fake.pdf')
      .field('title', 'Fake PDF')
      .field('entityType', 'policy');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Invalid file content for extension .pdf');
  });

  it('should reject text file upload if it contains null bytes', async () => {
    const nullByteContent = Buffer.concat([Buffer.from('hello'), Buffer.from([0]), Buffer.from('world')]);
    const response = await request(app)
      .post('/api/v1/evidence')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', nullByteContent, 'binary.txt')
      .field('title', 'Sneaky Text File')
      .field('entityType', 'policy');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Binary content detected in text file');
  });

  it('should allow valid PDF upload with correct magic bytes', async () => {
    const pdfMagicBytes = Buffer.from('%PDF-1.4\n%...\n%%EOF');
    const response = await request(app)
      .post('/api/v1/evidence')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', pdfMagicBytes, 'valid.pdf')
      .field('title', 'Valid PDF File')
      .field('entityType', 'policy');

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.fileName).toBe('valid.pdf');
  });
});

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
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

describe('Auth Endpoints (Integration)', () => {
  const RUN_ID = randomUUID().slice(0, 8);
  const TEST_EMAIL = `auth-test-${RUN_ID}@sentra.ai`;
  const TEST_PASSWORD = 'SecurePassword123!';
  const TEST_ORG_ID = '00000000-0000-0000-0000-000000000001'; // Default organization from seed

  beforeAll(async () => {
    // Create the test user in the real database
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);
    await prisma.users.create({
      data: {
        id: randomUUID(),
        email: TEST_EMAIL,
        full_name: 'Test Auth User',
        password_hash: passwordHash,
        role: 'ADMIN',
        is_active: true,
        organizationId: TEST_ORG_ID,
      }
    });
  });

  afterAll(async () => {
    // Clean up
    await prisma.users.deleteMany({ where: { email: TEST_EMAIL } }).catch(() => {});
  });

  describe('POST /api/v1/auth/login', () => {
    it('should return 200 and tokens on valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
    });

    it('should return 401 on invalid password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: TEST_EMAIL, password: 'wrongpassword' });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/refresh-token', () => {
    it('should refresh access token with valid refresh token', async () => {
      // Login to get a valid refresh token
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
      
      const refreshToken = loginRes.body.data.refreshToken;

      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ token: refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
    });
  });
});

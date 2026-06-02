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

describe('Auth Rate Limiting Integration Test', () => {
  it('should return 429 after 10 login attempts', async () => {
    // Send 10 requests which should be allowed (even if they fail with 401 or pass with 200, rate limiting counts them)
    for (let i = 0; i < 10; i++) {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nonexistent-user-rate-limit@sentra.ai', password: 'password123' });
      
      // Since it's a nonexistent user, it should return 401 (Unauthorized) rather than 429
      expect(res.status).not.toBe(429);
    }

    // The 11th request must return 429 (Too Many Requests)
    const blockedRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nonexistent-user-rate-limit@sentra.ai', password: 'password123' });

    expect(blockedRes.status).toBe(429);
    expect(blockedRes.body).toEqual({
      error: 'Too many attempts',
      retryAfter: 'See Retry-After header'
    });
    expect(blockedRes.headers).toHaveProperty('retry-after');
  });
});

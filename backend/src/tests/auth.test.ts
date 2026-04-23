import request from 'supertest';
import app from '../app';
import prisma from '../config/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

jest.mock('../config/db', () => ({
  users: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  refreshToken: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  },
  organizations: {
    findUnique: jest.fn(),
  }
}));

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

jest.mock('../utils/jwt', () => ({
  generateAccessToken: jest.fn().mockReturnValue('mock-access-token'),
  generateRefreshToken: jest.fn().mockReturnValue('mock-refresh-token'),
  verifyRefreshToken: jest.fn().mockReturnValue({ id: 'user-123' }),
}));

describe('Auth Endpoints', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    password_hash: 'hashed_pass',
    organizationId: 'org-123',
    full_name: 'Test User',
    role: 'ADMIN',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/login', () => {
    it('should return 200 and tokens on valid credentials', async () => {
      (prisma.users.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({ token: 'refresh-token' });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
    });

    it('should return 401 on invalid password', async () => {
      (prisma.users.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/refresh-token', () => {
    it('should refresh access token with valid refresh token', async () => {
      const mockRefreshToken = {
        token: 'valid-refresh-token',
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 10000),
        revoked: false,
      };

      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(mockRefreshToken);
      (prisma.users.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ token: 'valid-refresh-token' });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('accessToken');
    });
  });
});

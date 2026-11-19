import { createApiKey, listApiKeys, deleteApiKey } from '../controllers/apiKey.controller';
import prisma from '../config/db';
import * as companyUtil from '../utils/company';
import { getRedisClient } from '../config/redis';

const mockRedis = {
  del: jest.fn().mockResolvedValue(1),
};

jest.mock('../config/redis', () => ({
  getRedisClient: jest.fn(() => mockRedis),
}));

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../config/db', () => ({
  __esModule: true,
  default: {
    api_keys: {
      count: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('../utils/company', () => ({
  resolveOrganizationId: jest.fn(),
}));

describe('ApiKey Controller Unit Tests', () => {
  const mockOrgId = 'org-uuid-12345';
  let req: any;
  let res: any;

  beforeEach(() => {
    jest.clearAllMocks();
    (companyUtil.resolveOrganizationId as jest.Mock).mockResolvedValue(mockOrgId);

    req = {
      body: {},
      params: {},
      query: {},
      user: { organizationId: mockOrgId, role: 'ADMIN' },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('createApiKey', () => {
    it('generates full sentra_ key, hashes it, and returns unmasked key at creation time', async () => {
      req.body = { name: 'Production Pipeline Key' };

      (prisma.api_keys.create as jest.Mock).mockImplementation(async ({ data }: any) => ({
        id: data.id,
        organizationId: data.organizationId,
        name: data.name,
        key_prefix: data.key_prefix,
        created_at: new Date(),
      }));

      await createApiKey(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(201);
      const jsonResponse = res.json.mock.calls[0][0];
      expect(jsonResponse.success).toBe(true);

      const responseData = jsonResponse.data;
      expect(responseData.name).toBe('Production Pipeline Key');
      expect(responseData.api_key).toBeDefined();

      // Key must start with sentra_ and have prefix + secret
      expect(responseData.api_key.startsWith('sentra_')).toBe(true);
      expect(responseData.api_key).toMatch(/^sentra_[a-f0-9]{8}_[A-Za-z0-9_-]+$/);
      expect(responseData.api_key.length).toBeGreaterThanOrEqual(40);

      // Verify DB creation received hashed value, not plain text
      const createCall = (prisma.api_keys.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.key_hash).not.toBe(responseData.api_key);
      expect(createCall.data.key_hash.startsWith('$2b$') || createCall.data.key_hash.startsWith('$2a$')).toBe(true);
      expect(createCall.data.key_prefix).toBe(responseData.key_prefix);
    });

    it('rejects creation if organization context is missing', async () => {
      (companyUtil.resolveOrganizationId as jest.Mock).mockResolvedValue(null);
      req.body = { name: 'No Org Key' };

      await createApiKey(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Company context required' })
      );
    });
  });

  describe('listApiKeys', () => {
    it('returns 400 if pagination parsing fails (e.g. limit > 200)', async () => {
      req.query = { limit: '999' };
      await listApiKeys(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'limit must be ≤ 200' })
      );
    });

    it('returns empty list if organizationId is not resolved', async () => {
      (companyUtil.resolveOrganizationId as jest.Mock).mockResolvedValueOnce(null);
      await listApiKeys(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { data: [], nextCursor: null, total: 0 },
        })
      );
    });

    it('returns paginated records with nextCursor when hasMore is true', async () => {
      req.query = { limit: '2' };
      (prisma.api_keys.count as jest.Mock).mockResolvedValue(3);
      (prisma.api_keys.findMany as jest.Mock).mockResolvedValue([
        { id: 'key-1', name: 'Key 1', key_prefix: 'pref1', created_at: new Date() },
        { id: 'key-2', name: 'Key 2', key_prefix: 'pref2', created_at: new Date() },
        { id: 'key-3', name: 'Key 3', key_prefix: 'pref3', created_at: new Date() },
      ]);

      await listApiKeys(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      const json = res.json.mock.calls[0][0];
      expect(json.data.data.length).toBe(2);
      expect(json.data.nextCursor).toBe('key-2');
    });

    it('returns masked key records without full key or key_hash', async () => {
      (prisma.api_keys.count as jest.Mock).mockResolvedValue(2);
      (prisma.api_keys.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'key-1',
          name: 'Production Key',
          key_prefix: '6ebf5ae1',
          created_at: new Date('2026-07-01'),
        },
        {
          id: 'key-2',
          name: 'Staging Key',
          key_prefix: '41b9ef08',
          created_at: new Date('2026-08-01'),
        },
      ]);

      await listApiKeys(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      const jsonResponse = res.json.mock.calls[0][0];
      expect(jsonResponse.success).toBe(true);
      expect(jsonResponse.data.total).toBe(2);

      const items = jsonResponse.data.data;
      expect(items.length).toBe(2);
      items.forEach((item: any) => {
        expect(item.key_prefix).toBeDefined();
        // Secrets must NEVER be in list
        expect(item.api_key).toBeUndefined();
        expect(item.key_hash).toBeUndefined();
      });
    });
  });

  describe('deleteApiKey', () => {
    it('returns 400 when organizationId is missing', async () => {
      (companyUtil.resolveOrganizationId as jest.Mock).mockResolvedValueOnce(null);
      await deleteApiKey(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Company context required' })
      );
    });

    it('returns 404 when key is not found', async () => {
      req.params = { keyId: 'not-found' };
      (prisma.api_keys.findFirst as jest.Mock).mockResolvedValueOnce(null);
      await deleteApiKey(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'API key not found' })
      );
    });

    it('soft deletes active api key and deletes ak:<prefix> from Redis cache', async () => {
      req.params = { keyId: 'key-1' };
      (prisma.api_keys.findFirst as jest.Mock).mockResolvedValue({
        id: 'key-1',
        organizationId: mockOrgId,
        key_prefix: 'pref1234',
        is_active: true,
      });
      (prisma.api_keys.update as jest.Mock).mockResolvedValue({
        id: 'key-1',
        is_active: false,
      });

      await deleteApiKey(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(prisma.api_keys.update).toHaveBeenCalledWith({
        where: { id: 'key-1' },
        data: { is_active: false },
      });
      expect(mockRedis.del).toHaveBeenCalledWith('ak:pref1234');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, message: 'API key revoked' })
      );
    });

    it('soft deletes active api key even if Redis throws an error', async () => {
      req.params = { keyId: 'key-2' };
      mockRedis.del.mockRejectedValueOnce(new Error('Redis connection refused'));
      (prisma.api_keys.findFirst as jest.Mock).mockResolvedValue({
        id: 'key-2',
        organizationId: mockOrgId,
        key_prefix: 'pref5678',
        is_active: true,
      });
      (prisma.api_keys.update as jest.Mock).mockResolvedValue({
        id: 'key-2',
        is_active: false,
      });

      await deleteApiKey(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(prisma.api_keys.update).toHaveBeenCalledWith({
        where: { id: 'key-2' },
        data: { is_active: false },
      });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, message: 'API key revoked' })
      );
    });

    it('soft deletes active api key even when Redis client is null', async () => {
      req.params = { keyId: 'key-3' };
      (getRedisClient as jest.Mock).mockReturnValueOnce(null);
      (prisma.api_keys.findFirst as jest.Mock).mockResolvedValue({
        id: 'key-3',
        organizationId: mockOrgId,
        key_prefix: 'pref9999',
        is_active: true,
      });
      (prisma.api_keys.update as jest.Mock).mockResolvedValue({
        id: 'key-3',
        is_active: false,
      });

      await deleteApiKey(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(prisma.api_keys.update).toHaveBeenCalledWith({
        where: { id: 'key-3' },
        data: { is_active: false },
      });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, message: 'API key revoked' })
      );
    });
  });
});

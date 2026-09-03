import { createApiKey, listApiKeys, deleteApiKey } from '../controllers/apiKey.controller';
import prisma from '../config/db';
import * as companyUtil from '../utils/company';

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
    it('soft deletes active api key', async () => {
      req.params = { keyId: 'key-1' };
      (prisma.api_keys.findFirst as jest.Mock).mockResolvedValue({
        id: 'key-1',
        organizationId: mockOrgId,
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
    });
  });
});

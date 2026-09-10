import { recordSdkConnection } from '../src/utils/usage';
import { getSdkStatus } from '../src/controllers/organization.controller';
import prisma from '../src/config/db';
import { getRedisClient } from '../src/config/redis';

jest.mock('../src/config/db', () => ({
  __esModule: true,
  default: {
    organizations: {
      findUnique: jest.fn(),
      update: jest.fn(),
    }
  }
}));

jest.mock('../src/config/redis', () => ({
  getRedisClient: jest.fn()
}));

describe('SDK Connection Tracking & Fallback', () => {
  const orgId = 'test-org-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('recordSdkConnection', () => {
    it('should set Redis key and update DB if not cached', async () => {
      const mockRedis = {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue('OK'),
      };
      (getRedisClient as jest.Mock).mockReturnValue(mockRedis);
      (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
        id: orgId,
        sdkConnectedAt: null,
      });
      (prisma.organizations.update as jest.Mock).mockResolvedValue({
        id: orgId,
        sdkConnectedAt: new Date(),
      });

      recordSdkConnection(orgId);

      // Give setImmediate time to execute
      await new Promise(resolve => setImmediate(resolve));

      expect(mockRedis.get).toHaveBeenCalledWith(`sdk_conn:${orgId}`);
      expect(mockRedis.set).toHaveBeenCalledWith(`sdk_conn:${orgId}`, '1', 'EX', 86400);
      expect(prisma.organizations.findUnique).toHaveBeenCalledWith({
        where: { id: orgId },
        select: { sdkConnectedAt: true }
      });
      expect(prisma.organizations.update).toHaveBeenCalled();
    });

    it('should fallback directly to PostgreSQL if Redis client throws or is disconnected', async () => {
      const mockRedis = {
        get: jest.fn().mockRejectedValue(new Error('Redis connection refused')),
      };
      (getRedisClient as jest.Mock).mockReturnValue(mockRedis);
      (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
        id: orgId,
        sdkConnectedAt: null,
      });
      (prisma.organizations.update as jest.Mock).mockResolvedValue({
        id: orgId,
        sdkConnectedAt: new Date(),
      });

      recordSdkConnection(orgId);

      // Give setImmediate time to execute
      await new Promise(resolve => setImmediate(resolve));

      expect(prisma.organizations.findUnique).toHaveBeenCalledWith({
        where: { id: orgId },
        select: { sdkConnectedAt: true }
      });
      expect(prisma.organizations.update).toHaveBeenCalled();
    });

    it('should not update DB if sdkConnectedAt is already set', async () => {
      const mockRedis = {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue('OK'),
      };
      (getRedisClient as jest.Mock).mockReturnValue(mockRedis);
      (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
        id: orgId,
        sdkConnectedAt: new Date('2026-09-01T00:00:00Z'),
      });

      recordSdkConnection(orgId);

      await new Promise(resolve => setImmediate(resolve));

      expect(prisma.organizations.update).not.toHaveBeenCalled();
    });
  });

  describe('getSdkStatus Controller', () => {
    it('should return connected: false when sdkConnectedAt is null', async () => {
      const req: any = {
        user: { organizationId: orgId },
        params: {}
      };
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
        sdkConnectedAt: null
      });

      await getSdkStatus(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            connected: false,
            connectedAt: null
          })
        })
      );
    });

    it('should return connected: true when sdkConnectedAt is present', async () => {
      const timestamp = new Date('2026-09-10T08:00:00Z');
      const req: any = {
        user: { organizationId: orgId },
        params: {}
      };
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
        sdkConnectedAt: timestamp
      });

      await getSdkStatus(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            connected: true,
            connectedAt: timestamp
          })
        })
      );
    });
  });
});

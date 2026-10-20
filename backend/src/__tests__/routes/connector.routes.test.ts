jest.mock('../../config/db', () => ({
  __esModule: true,
  default: {
    connectors: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    organizations: {
      findUnique: jest.fn(),
    },
    users: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../../services/queue.service', () => ({
  enqueueConnectorScan: jest.fn().mockResolvedValue(undefined),
  processConnectorScan: jest.fn().mockResolvedValue(undefined),
  activityQueue: null,
  connectorQueue: null,
}));

jest.mock('../../services/connectorTest.service', () => ({
  testConnectorSource: jest.fn(),
}));

jest.mock('../../server', () => ({
  io: { to: jest.fn().mockReturnThis(), emit: jest.fn() },
}));

import request from 'supertest';
import app from '../../app';
import prisma from '../../config/db';
import { testConnectorSource } from '../../services/connectorTest.service';
import { enqueueConnectorScan } from '../../services/queue.service';
import { generateAccessToken } from '../../utils/jwt';

describe('Connector API Routes', () => {
  const orgId = 'test-org-123';
  const userId = 'user-123';
  const authToken = generateAccessToken({
    id: userId,
    email: 'admin@sentra.ai',
    role: 'ADMIN',
    orgId,
    organizationId: orgId,
  });

  const memberUserId = 'user-member-456';
  const memberToken = generateAccessToken({
    id: memberUserId,
    email: 'member@sentra.ai',
    role: 'MEMBER',
    orgId,
    organizationId: orgId,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ALLOW_PRIVATE_NETWORK_TARGETS = 'true';
    (prisma.users.findUnique as jest.Mock).mockImplementation(({ where }) => {
      if (where?.id === memberUserId) {
        return Promise.resolve({
          id: memberUserId,
          email: 'member@sentra.ai',
          role: 'MEMBER',
          is_active: true,
          organizationId: orgId,
          organizations: {
            id: orgId,
            name: 'Test Org',
            is_active: true,
          },
        });
      }
      return Promise.resolve({
        id: userId,
        email: 'admin@sentra.ai',
        role: 'ADMIN',
        is_active: true,
        organizationId: orgId,
        organizations: {
          id: orgId,
          name: 'Test Org',
          is_active: true,
        },
      });
    });
  });

  describe('GET /api/connectors', () => {
    it('returns sanitized list of connectors with last_error and status', async () => {
      (prisma.connectors.count as jest.Mock).mockResolvedValue(1);
      (prisma.connectors.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'conn-1',
          name: 'Primary S3',
          type: 's3',
          organizationId: orgId,
          status: 'active',
          last_scan_at: '2026-10-20T00:00:00.000Z',
          last_error: null,
          credentials: 'encrypted-secret-token',
          config: { bucketName: 'my-bucket', secretAccessKey: 'raw-secret' },
          created_at: new Date(),
        },
      ]);

      const res = await request(app)
        .get('/api/v1/connectors')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.data).toHaveLength(1);
      const conn = res.body.data.data[0];
      expect(conn.name).toBe('Primary S3');
      expect(conn.credentials).toBeUndefined();
      expect(conn.config.secretAccessKey).toBeUndefined();
      expect(conn.config.bucketName).toBe('my-bucket');
      expect(conn.last_error).toBeNull();
    });
  });

  describe('POST /api/connectors/test', () => {
    it('rejects "local" type with 400 validation error', async () => {
      const res = await request(app)
        .post('/api/v1/connectors/test')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'local',
          config: { path: '/tmp' },
        });

      expect(res.status).toBe(400);
      expect(testConnectorSource).not.toHaveBeenCalled();
    });

    it('returns 200 when test connection succeeds', async () => {
      (testConnectorSource as jest.Mock).mockResolvedValueOnce({
        success: true,
        message: 'Successfully connected to PostgreSQL database.',
        details: { tableCount: 12 },
      });

      const res = await request(app)
        .post('/api/v1/connectors/test')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'postgres',
          credentials: {
            host: 'db.example.com',
            port: 5432,
            user: 'sentra_readonly',
            password: 'secret_password',
            database: 'prod_db',
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Successfully connected');
      expect(testConnectorSource).toHaveBeenCalledWith(
        'postgres',
        undefined,
        expect.objectContaining({ host: 'db.example.com' }),
        true
      );
    });

    it('blocks non-admin user sending allowCustomPort: true with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/connectors/test')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          type: 'postgres',
          config: { allowCustomPort: true },
          credentials: {
            host: 'db.example.com',
            port: 5000,
            user: 'sentra_readonly',
            password: 'secret_password',
            database: 'prod_db',
          },
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Only administrators can configure or test custom database ports');
      expect(testConnectorSource).not.toHaveBeenCalled();
    });

    it('blocks non-admin user sending fake approver ID without allowCustomPort with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/connectors/test')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          type: 'postgres',
          config: {
            allowCustomPortApprovedBy: 'fake-admin-uuid-999',
          },
          credentials: {
            host: 'db.example.com',
            port: 5000,
            user: 'sentra_readonly',
            password: 'secret_password',
            database: 'prod_db',
          },
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Only administrators can configure or test custom database ports');
      expect(testConnectorSource).not.toHaveBeenCalled();
    });

    it('allows admin user sending allowCustomPort: true to test custom database port', async () => {
      (testConnectorSource as jest.Mock).mockResolvedValueOnce({
        success: true,
        message: 'Successfully connected to PostgreSQL database on custom port.',
      });

      const res = await request(app)
        .post('/api/v1/connectors/test')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'postgres',
          config: { allowCustomPort: true },
          credentials: {
            host: 'db.example.com',
            port: 5000,
            user: 'sentra_readonly',
            password: 'secret_password',
            database: 'prod_db',
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(testConnectorSource).toHaveBeenCalledWith(
        'postgres',
        expect.objectContaining({ allowCustomPort: true }),
        expect.objectContaining({ host: 'db.example.com', port: 5000 }),
        true
      );
    });

    it('returns 400 when test connection fails', async () => {
      (testConnectorSource as jest.Mock).mockResolvedValueOnce({
        success: false,
        message: 'SSRF validation failed: Target host resolves to private address.',
      });

      const res = await request(app)
        .post('/api/v1/connectors/test')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'postgres',
          credentials: { host: '169.254.169.254' },
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('SSRF validation failed');
    });
  });

  describe('POST /api/connectors', () => {
    it('blocks non-admin user creating connector with allowCustomPort: true with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/connectors')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          name: 'Custom Port Postgres',
          type: 'postgres',
          config: { allowCustomPort: true },
          credentials: {
            host: 'db.example.com',
            port: 5000,
            user: 'user',
            password: 'pw',
          },
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Only administrators can configure custom database ports');
      expect(prisma.connectors.create).not.toHaveBeenCalled();
    });

    it('allows admin user creating connector with allowCustomPort: true and records approval metadata', async () => {
      (prisma.connectors.create as jest.Mock).mockImplementation(({ data }) => ({
        ...data,
        created_at: new Date(),
        updated_at: new Date(),
      }));

      const res = await request(app)
        .post('/api/v1/connectors')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Custom Port Postgres Admin',
          type: 'postgres',
          config: { allowCustomPort: true },
          credentials: {
            host: 'db.example.com',
            port: 5000,
            user: 'user',
            password: 'pw',
          },
        });

      expect(res.status).toBe(201);
      expect(prisma.connectors.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          config: expect.objectContaining({
            allowCustomPort: true,
            allowCustomPortApprovedBy: userId,
          }),
        }),
      }));
    });

    it('blocks non-admin user sending fake approver ID without allowCustomPort when creating connector with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/connectors')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          name: 'Spoofed Approver Postgres',
          type: 'postgres',
          config: {
            allowCustomPortApprovedBy: 'fake-admin-uuid-999',
          },
          credentials: {
            host: 'db.example.com',
            port: 5000,
            user: 'user',
            password: 'pw',
          },
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Only administrators can configure custom database ports');
      expect(prisma.connectors.create).not.toHaveBeenCalled();
    });

    it('strips client-supplied fake approver ID even when admin creates connector and uses authentic admin ID', async () => {
      (prisma.connectors.create as jest.Mock).mockImplementation(({ data }) => ({
        ...data,
        created_at: new Date(),
        updated_at: new Date(),
      }));

      const res = await request(app)
        .post('/api/v1/connectors')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Custom Port Postgres Admin Fake Approver Attempt',
          type: 'postgres',
          config: {
            allowCustomPort: true,
            allowCustomPortApprovedBy: 'spoofed-admin-id-999',
          },
          credentials: {
            host: 'db.example.com',
            port: 5000,
            user: 'user',
            password: 'pw',
          },
        });

      expect(res.status).toBe(201);
      expect(prisma.connectors.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          config: expect.objectContaining({
            allowCustomPort: true,
            allowCustomPortApprovedBy: userId,
          }),
        }),
      }));
    });
    it('rejects "local" type in creation validation', async () => {
      const res = await request(app)
        .post('/api/v1/connectors')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Local filesystem',
          type: 'local',
        });

      expect(res.status).toBe(400);
      expect(prisma.connectors.create).not.toHaveBeenCalled();
    });

    it('creates connector with encrypted credentials and enqueues scan', async () => {
      (prisma.connectors.create as jest.Mock).mockImplementation(({ data }) => ({
        ...data,
        created_at: new Date(),
        updated_at: new Date(),
      }));

      const res = await request(app)
        .post('/api/v1/connectors')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Enterprise Postgres',
          type: 'postgres',
          credentials: {
            host: 'postgres.internal-safe.com',
            port: 5432,
            user: 'sentraa_readonly',
            password: 'my-super-secret-password',
            database: 'analytics',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Enterprise Postgres');
      expect(res.body.data.credentials).toBeUndefined();
      expect(enqueueConnectorScan).toHaveBeenCalledWith('postgres', expect.any(String));

      // Verify that stored credentials were encrypted
      expect(prisma.connectors.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          credentials: expect.stringMatching(/^[0-9a-fA-F]{24}:[0-9a-fA-F]{32}:/),
        }),
      }));
    });
  });

  describe('POST /api/connectors/:id/scan', () => {
    it('enqueues connector scan if connector exists', async () => {
      (prisma.connectors.findFirst as jest.Mock).mockResolvedValueOnce({
        id: 'conn-scan-1',
        type: 'postgres',
        organizationId: orgId,
      });

      const res = await request(app)
        .post('/api/v1/connectors/conn-scan-1/scan')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(enqueueConnectorScan).toHaveBeenCalledWith('postgres', 'conn-scan-1', { reason: 'manual' });
    });

    it('returns 404 if connector does not exist', async () => {
      (prisma.connectors.findFirst as jest.Mock).mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/v1/connectors/non-existent/scan')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/connectors/:id', () => {
    it('deletes connector if found', async () => {
      (prisma.connectors.findFirst as jest.Mock).mockResolvedValueOnce({
        id: 'conn-del-1',
        organizationId: orgId,
      });
      (prisma.connectors.delete as jest.Mock).mockResolvedValueOnce({});

      const res = await request(app)
        .delete('/api/v1/connectors/conn-del-1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(prisma.connectors.delete).toHaveBeenCalledWith({ where: { id: 'conn-del-1' } });
    });
  });
});

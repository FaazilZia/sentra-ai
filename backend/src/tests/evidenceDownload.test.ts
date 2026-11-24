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

const mockPrisma = {
  evidence: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  users: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  organizations: {
    findUnique: jest.fn(),
  },
  jwt_blacklist: {
    findUnique: jest.fn(),
  },
};

jest.mock('../config/db', () => ({
  __esModule: true,
  default: mockPrisma,
}));

import request from 'supertest';
import app from '../app';
import path from 'path';
import fs from 'fs';
import { generateAccessToken } from '../utils/jwt';
import { EvidenceService } from '../services/evidence.service';

describe('Evidence Download Security & Avatar Uploads', () => {
  const OWNER_ORG_ID = 'org-owner-111';
  const OTHER_ORG_ID = 'org-other-222';
  const OWNER_USER_ID = 'user-owner-111';
  const OTHER_USER_ID = 'user-other-222';

  const ownerToken = generateAccessToken({ id: OWNER_USER_ID, role: 'ADMIN', organizationId: OWNER_ORG_ID });
  const otherToken = generateAccessToken({ id: OTHER_USER_ID, role: 'ADMIN', organizationId: OTHER_ORG_ID });

  const testEvidenceFileName = 'test-evidence-doc.pdf';
  const testEvidenceFilePath = path.join(process.cwd(), 'uploads', testEvidenceFileName);
  const testAvatarFileName = 'avatar-test-user-123.png';
  const testAvatarsDir = path.join(process.cwd(), 'uploads', 'avatars');
  const testAvatarFilePath = path.join(testAvatarsDir, testAvatarFileName);

  beforeAll(() => {
    if (!fs.existsSync(testAvatarsDir)) {
      fs.mkdirSync(testAvatarsDir, { recursive: true });
    }
    fs.writeFileSync(testEvidenceFilePath, Buffer.from('%PDF-1.4 sample evidence binary content'));
    fs.writeFileSync(testAvatarFilePath, Buffer.from('fake-avatar-image-data'));
  });

  afterAll(() => {
    if (fs.existsSync(testEvidenceFilePath)) fs.unlinkSync(testEvidenceFilePath);
    if (fs.existsSync(testAvatarFilePath)) fs.unlinkSync(testAvatarFilePath);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.jwt_blacklist.findUnique.mockResolvedValue(null);
    mockPrisma.organizations.findUnique.mockResolvedValue({ id: OWNER_ORG_ID, is_active: true, plan: 'ENTERPRISE' });
    mockPrisma.users.findUnique.mockImplementation(({ where }: any) => {
      if (where.id === OWNER_USER_ID) {
        return Promise.resolve({
          id: OWNER_USER_ID,
          organizationId: OWNER_ORG_ID,
          role: 'ADMIN',
          is_active: true,
          organizations: { id: OWNER_ORG_ID, is_active: true }
        });
      }
      if (where.id === OTHER_USER_ID) {
        return Promise.resolve({
          id: OTHER_USER_ID,
          organizationId: OTHER_ORG_ID,
          role: 'ADMIN',
          is_active: true,
          organizations: { id: OTHER_ORG_ID, is_active: true }
        });
      }
      return Promise.resolve(null);
    });
  });

  describe('GET /api/v1/evidence/:id/download Authentication and Authorization', () => {
    it('returns 401 when no login / authentication credentials are provided', async () => {
      const response = await request(app).get('/api/v1/evidence/ev-123/download');
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('returns 403 when user from another organization attempts to download evidence', async () => {
      mockPrisma.evidence.findUnique.mockResolvedValue({
        id: 'ev-123',
        orgId: OWNER_ORG_ID,
        fileName: 'test-evidence-doc.pdf',
        fileUrl: `/uploads/${testEvidenceFileName}`,
        mimeType: 'application/pdf',
        fileSize: 1024,
      });

      const response = await request(app)
        .get('/api/v1/evidence/ev-123/download')
        .set('Authorization', `Bearer ${otherToken}`);

      expect([403, 404]).toContain(response.status);
      expect(response.body.success).toBe(false);
    });

    it('returns 404 when evidence record does not exist', async () => {
      mockPrisma.evidence.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/evidence/ev-nonexistent/download')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('returns 404 when local evidence file is missing on storage', async () => {
      mockPrisma.evidence.findUnique.mockResolvedValue({
        id: 'ev-missing-file',
        orgId: OWNER_ORG_ID,
        fileName: 'missing-on-disk.pdf',
        fileUrl: '/uploads/missing-file-that-does-not-exist.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
      });

      const response = await request(app)
        .get('/api/v1/evidence/ev-missing-file/download')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('returns the file stream when owner user requests download', async () => {
      mockPrisma.evidence.findUnique.mockResolvedValue({
        id: 'ev-123',
        orgId: OWNER_ORG_ID,
        fileName: 'test-evidence-doc.pdf',
        fileUrl: `/uploads/${testEvidenceFileName}`,
        mimeType: 'application/pdf',
        fileSize: 37,
      });

      const response = await request(app)
        .get('/api/v1/evidence/ev-123/download')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.header['content-disposition']).toContain('attachment');
      expect(response.header['x-content-type-options']).toBe('nosniff');
      expect(response.body.toString()).toContain('%PDF-1.4');
    });

    it('handles S3 download returning JSON with downloadUrl when JSON accepted', async () => {
      const spy = jest.spyOn(EvidenceService, 'getEvidenceDownload').mockResolvedValueOnce({
        status: 200,
        type: 's3',
        url: 'https://sentra-bucket.s3.us-east-1.amazonaws.com/test-presigned-url',
        fileName: 'cloud-evidence.pdf',
        mimeType: 'application/pdf',
        fileSize: 2048,
      });

      const response = await request(app)
        .get('/api/v1/evidence/ev-s3/download')
        .set('Authorization', `Bearer ${ownerToken}`)
        .set('Accept', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.downloadUrl).toContain('amazonaws.com');
      spy.mockRestore();
    });

    it('redirects to S3 presigned URL when redirect query param is provided', async () => {
      const spy = jest.spyOn(EvidenceService, 'getEvidenceDownload').mockResolvedValueOnce({
        status: 200,
        type: 's3',
        url: 'https://sentra-bucket.s3.us-east-1.amazonaws.com/test-presigned-url',
        fileName: 'cloud-evidence.pdf',
        mimeType: 'application/pdf',
        fileSize: 2048,
      });

      const response = await request(app)
        .get('/api/v1/evidence/ev-s3/download?redirect=true')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(302);
      expect(response.header.location).toBe('https://sentra-bucket.s3.us-east-1.amazonaws.com/test-presigned-url');
      spy.mockRestore();
    });
  });

  describe('Public uploads isolation and avatar serving', () => {
    it('loads avatar from /uploads/avatars without login', async () => {
      const response = await request(app).get(`/uploads/avatars/${testAvatarFileName}`);
      expect(response.status).toBe(200);
      expect(response.body.toString()).toContain('fake-avatar-image-data');
    });

    it('keeps old avatar URLs working via redirect or fallback without login', async () => {
      const response = await request(app).get(`/uploads/${testAvatarFileName}`);
      expect([200, 301, 302]).toContain(response.status);
      if (response.status === 302 || response.status === 301) {
        expect(response.header.location).toBe(`/uploads/avatars/${testAvatarFileName}`);
      }
    });

    it('does NOT serve evidence files publicly under /uploads', async () => {
      const response = await request(app).get(`/uploads/${testEvidenceFileName}`);
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('rejects invalid or traversal file patterns under /uploads with 404', async () => {
      const response = await request(app).get('/uploads/malicious-file.sh');
      expect(response.status).toBe(404);
    });

    it('allows authenticated users to upload avatars to /uploads/avatars', async () => {
      mockPrisma.users.update.mockResolvedValue({
        id: OWNER_USER_ID,
        avatarUrl: `http://localhost:10000/uploads/avatars/avatar-${OWNER_USER_ID}-123.png`,
      });

      const response = await request(app)
        .put('/api/v1/user/me/avatar')
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('avatar', Buffer.from('fake-png-content'), 'avatar.png');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.avatarUrl).toContain('/uploads/avatars/');
    });
  });

  describe('GET /api/v1/evidence/:id/download Controller Edge Cases', () => {
    it('blocks path traversal and returns 404 when localPath resolves outside uploads root', async () => {
      const spy = jest.spyOn(EvidenceService, 'getEvidenceDownload').mockResolvedValueOnce({
        status: 200,
        type: 'local',
        localPath: '/etc/passwd',
        fileName: 'passwd',
        mimeType: 'text/plain',
        fileSize: 100,
      });

      const response = await request(app)
        .get('/api/v1/evidence/ev-traversal/download')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Evidence file not found');
      spy.mockRestore();
    });

    it('returns 404 when resolvedPath in uploads root does not exist on disk', async () => {
      const spy = jest.spyOn(EvidenceService, 'getEvidenceDownload').mockResolvedValueOnce({
        status: 200,
        type: 'local',
        localPath: path.join(process.cwd(), 'uploads', 'nonexistent-ghost-file.pdf'),
        fileName: 'ghost.pdf',
        mimeType: 'application/pdf',
        fileSize: 100,
      });

      const response = await request(app)
        .get('/api/v1/evidence/ev-ghost/download')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Evidence file not found');
      spy.mockRestore();
    });

    it('handles stream error callback in res.download with 500 status', async () => {
      const spy = jest.spyOn(EvidenceService, 'getEvidenceDownload').mockResolvedValueOnce({
        status: 200,
        type: 'local',
        localPath: testEvidenceFilePath,
        fileName: 'test-evidence-doc.pdf',
        mimeType: 'application/pdf',
        fileSize: 37,
      });

      const originalDownload = (app.response as any).download;
      (app.response as any).download = function (this: any, filePath: string, filename: string, fn: (err?: any) => void) {
        if (fn) fn(new Error('Simulated stream IO failure'));
      };

      try {
        const response = await request(app)
          .get('/api/v1/evidence/ev-stream-err/download')
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(response.status).toBe(500);
        expect(response.body.message).toBe('Error downloading evidence file');
      } finally {
        (app.response as any).download = originalDownload;
        spy.mockRestore();
      }
    });

    it('returns 500 when download result type is unhandled', async () => {
      const spy = jest.spyOn(EvidenceService, 'getEvidenceDownload').mockResolvedValueOnce({
        status: 200,
        type: 'unhandled_ftp_type' as any,
        fileName: 'unhandled.pdf',
      } as any);

      const response = await request(app)
        .get('/api/v1/evidence/ev-unhandled/download')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Unable to process evidence download');
      spy.mockRestore();
    });

    it('retrieves evidence details via GET /api/v1/evidence/:id', async () => {
      mockPrisma.evidence.findFirst.mockResolvedValueOnce({
        id: 'ev-123',
        orgId: OWNER_ORG_ID,
        title: 'Evidence Details',
        fileName: 'test.pdf',
        fileUrl: '/uploads/test.pdf',
      });

      const response = await request(app)
        .get('/api/v1/evidence/ev-123')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('ev-123');
    });

    it('deletes evidence record via DELETE /api/v1/evidence/:id', async () => {
      mockPrisma.evidence.findFirst.mockResolvedValueOnce({
        id: 'ev-123',
        fileUrl: '/uploads/test.pdf',
      });
      mockPrisma.evidence.delete.mockResolvedValueOnce({ id: 'ev-123' });

      const response = await request(app)
        .delete('/api/v1/evidence/ev-123')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('User Routes and Profile Management', () => {
    it('returns 400 when uploading avatar without a file', async () => {
      const response = await request(app)
        .put('/api/v1/user/me/avatar')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('No file uploaded');
    });

    it('lists active users in organization via GET /api/v1/users', async () => {
      mockPrisma.users.findMany.mockResolvedValueOnce([
        { id: OWNER_USER_ID, full_name: 'Owner User', email: 'owner@sentra.ai', role: 'ADMIN', avatarUrl: null, jobTitle: 'Lead' }
      ]);

      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('retrieves user profile via GET /api/v1/user/me', async () => {
      const response = await request(app)
        .get('/api/v1/user/me')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('updates user profile via PATCH /api/v1/user/me', async () => {
      mockPrisma.users.update.mockResolvedValueOnce({
        id: OWNER_USER_ID,
        email: 'owner@sentra.ai',
        full_name: 'Updated Name',
        jobTitle: 'VP Security',
        avatarUrl: null,
      });

      const response = await request(app)
        .patch('/api/v1/user/me')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ fullName: 'Updated Name', jobTitle: 'VP Security' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.fullName).toBe('Updated Name');
      expect(response.body.data.jobTitle).toBe('VP Security');
    });
  });

  describe('EvidenceService S3 & Production startup configuration', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
      process.env = { ...originalEnv };
    });

    it('emits loud warning on startup in production when AWS_S3_BUCKET is missing', () => {
      delete process.env.AWS_S3_BUCKET;
      process.env.NODE_ENV = 'production';

      let isolatedLogger: any;
      jest.isolateModules(() => {
        const loggerModule = require('../utils/logger');
        isolatedLogger = loggerModule.default || loggerModule.logger || loggerModule;
        jest.spyOn(isolatedLogger, 'warn').mockImplementation(() => {});
        require('../services/evidence.service');
      });

      expect(isolatedLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('CRITICAL STARTUP WARNING: AWS_S3_BUCKET is not configured in production!')
      );
    });

    it('generates a presigned S3 URL when bucket and s3Client are configured', async () => {
      process.env.AWS_S3_BUCKET = 'sentra-test-bucket';
      process.env.AWS_REGION = 'us-east-1';
      process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
      process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';

      let isolatedEvidenceService: any;
      let isolatedDb: any;
      jest.isolateModules(() => {
        jest.doMock('@aws-sdk/s3-request-presigner', () => ({
          getSignedUrl: jest.fn().mockResolvedValue('https://sentra-test-bucket.s3.us-east-1.amazonaws.com/orgs/org-123/evidence/evidence-file.pdf?X-Amz-Signature=fake'),
        }));
        isolatedDb = require('../config/db').default;
        isolatedEvidenceService = require('../services/evidence.service').EvidenceService;
      });

      isolatedDb.evidence.findUnique.mockResolvedValueOnce({
        id: 'ev-s3-presigned-1',
        orgId: OWNER_ORG_ID,
        fileName: 'evidence-file.pdf',
        fileUrl: 'https://sentra-test-bucket.s3.us-east-1.amazonaws.com/orgs/org-123/evidence/evidence-file.pdf',
        mimeType: 'application/pdf',
        fileSize: 5000,
      });

      const result = await isolatedEvidenceService.getEvidenceDownload('ev-s3-presigned-1', OWNER_ORG_ID);
      expect(result.status).toBe(200);
      expect(result.type).toBe('s3');
      expect(result.url).toContain('X-Amz-Signature=fake');
      expect(result.fileName).toBe('evidence-file.pdf');
      expect(result.mimeType).toBe('application/pdf');
      expect(result.fileSize).toBe(5000);
    });

    it('catches and logs warning if S3 presigned URL generation fails', async () => {
      process.env.AWS_S3_BUCKET = 'sentra-test-bucket';
      process.env.AWS_REGION = 'us-east-1';

      let isolatedEvidenceService: any;
      let isolatedDb: any;
      jest.isolateModules(() => {
        jest.doMock('@aws-sdk/s3-request-presigner', () => ({
          getSignedUrl: jest.fn().mockRejectedValue(new Error('KMS Decryption failed')),
        }));
        isolatedDb = require('../config/db').default;
        isolatedEvidenceService = require('../services/evidence.service').EvidenceService;
      });

      isolatedDb.evidence.findUnique.mockResolvedValueOnce({
        id: 'ev-s3-fail',
        orgId: OWNER_ORG_ID,
        fileName: 'evidence-file.pdf',
        fileUrl: 'https://sentra-test-bucket.s3.us-east-1.amazonaws.com/orgs/org-123/evidence/evidence-file.pdf',
        mimeType: 'application/pdf',
        fileSize: 5000,
      });

      const result = await isolatedEvidenceService.getEvidenceDownload('ev-s3-fail', OWNER_ORG_ID);
      expect(result.status).toBe(404);
      expect(result.error).toContain('Evidence file not found on storage');
    });

    it('falls back to uploads/evidence/ subdirectory when file exists there', async () => {
      const evidenceDir = path.join(process.cwd(), 'uploads', 'evidence');
      if (!fs.existsSync(evidenceDir)) {
        fs.mkdirSync(evidenceDir, { recursive: true });
      }
      const subfilePath = path.join(evidenceDir, 'subdir-file.pdf');
      fs.writeFileSync(subfilePath, Buffer.from('sub-dir content'));

      try {
        mockPrisma.evidence.findUnique.mockResolvedValueOnce({
          id: 'ev-subdir',
          orgId: OWNER_ORG_ID,
          fileName: 'subdir-file.pdf',
          fileUrl: '/uploads/subdir-file.pdf',
          mimeType: 'application/pdf',
          fileSize: 15,
        });

        const result = await EvidenceService.getEvidenceDownload('ev-subdir', OWNER_ORG_ID);
        expect(result.status).toBe(200);
        expect(result.type).toBe('local');
        if (result.type === 'local') {
          expect(result.localPath).toBe(subfilePath);
        }
      } finally {
        if (fs.existsSync(subfilePath)) fs.unlinkSync(subfilePath);
      }
    });
  });
});

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
      expect(response.header['content-type']).toContain('application/pdf');
      expect(response.body.toString()).toContain('%PDF-1.4');
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
      expect([200, 301]).toContain(response.status);
      if (response.status === 301) {
        expect(response.header.location).toBe(`/uploads/avatars/${testAvatarFileName}`);
      }
    });

    it('does NOT serve evidence files publicly under /uploads', async () => {
      const response = await request(app).get(`/uploads/${testEvidenceFileName}`);
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
});

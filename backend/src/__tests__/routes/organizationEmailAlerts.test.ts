jest.mock('../../config/db', () => ({
  __esModule: true,
  default: {
    organizations: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    users: {
      findUnique: jest.fn(),
    },
    slack_config: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    jira_config: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
  },
}));

jest.mock('../../server', () => ({
  io: { to: jest.fn().mockReturnThis(), emit: jest.fn() },
}));

jest.mock('nodemailer');

import nodemailer from 'nodemailer';
import request from 'supertest';
import app from '../../app';
import prisma from '../../config/db';
import { generateAccessToken } from '../../utils/jwt';
import { emailAlertService } from '../../services/emailAlert.service';

describe('Organization Email Alert Channel Routes', () => {
  const orgId = 'test-org-alpha-999';
  const adminId = 'admin-user-111';
  const viewerId = 'viewer-user-222';

  const adminToken = generateAccessToken({
    id: adminId,
    email: 'admin@sentra.ai',
    role: 'ADMIN',
    organizationId: orgId,
  });

  const viewerToken = generateAccessToken({
    id: viewerId,
    email: 'viewer@sentra.ai',
    role: 'VIEWER',
    organizationId: orgId,
  });

  const mockSendMail = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    emailAlertService.resetRateLimits();
    emailAlertService.setDb(prisma);

    (prisma.users.findUnique as jest.Mock).mockImplementation(({ where }) => {
      if (where.id === adminId) {
        return Promise.resolve({
          id: adminId,
          email: 'admin@sentra.ai',
          role: 'ADMIN',
          organizationId: orgId,
          is_active: true,
          organizations: { id: orgId, is_active: true, slug: 'alpha' },
        });
      }
      if (where.id === viewerId) {
        return Promise.resolve({
          id: viewerId,
          email: 'viewer@sentra.ai',
          role: 'VIEWER',
          organizationId: orgId,
          is_active: true,
          organizations: { id: orgId, is_active: true, slug: 'alpha' },
        });
      }
      return Promise.resolve(null);
    });

    process.env.SMTP_HOST = 'smtp.testserver.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'test-user';
    process.env.SMTP_PASS = 'secret-pass';

    mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: mockSendMail,
    });
  });

  describe('GET /api/v1/organizations/email-alerts', () => {
    it('returns 401 when request is unauthenticated', async () => {
      const res = await request(app).get('/api/v1/organizations/email-alerts');
      expect(res.status).toBe(401);
    });

    it('returns 200 with email alert settings for authenticated user', async () => {
      (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
        id: orgId,
        name: 'Alpha Corp',
        alertEmail: JSON.stringify({
          recipients: ['sec@alpha.com'],
          enabled: true,
          severityFilter: 'high',
          hourlyRateLimit: 15,
        }),
      });

      const res = await request(app)
        .get('/api/v1/organizations/email-alerts')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.recipients).toEqual(['sec@alpha.com']);
      expect(res.body.data.enabled).toBe(true);
      expect(res.body.data.severityFilter).toBe('high');
      expect(res.body.data.hourlyRateLimit).toBe(15);
    });
  });

  describe('PUT /api/v1/organizations/email-alerts', () => {
    it('returns 401 when request is unauthenticated', async () => {
      const res = await request(app)
        .put('/api/v1/organizations/email-alerts')
        .send({ recipients: ['a@b.com'], enabled: true });
      expect(res.status).toBe(401);
    });

    it('returns 403 when user is not an ADMIN', async () => {
      const res = await request(app)
        .put('/api/v1/organizations/email-alerts')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ recipients: ['sec@alpha.com'], enabled: true });
      expect(res.status).toBe(403);
    });

    it('returns 400 when more than 10 recipients are provided', async () => {
      const eleven = Array.from({ length: 11 }, (_, i) => `user${i}@alpha.com`);
      const res = await request(app)
        .put('/api/v1/organizations/email-alerts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ recipients: eleven, enabled: true });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('maximum of 10 alert recipients');
    });

    it('returns 400 when an invalid email format is supplied', async () => {
      const res = await request(app)
        .put('/api/v1/organizations/email-alerts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ recipients: ['valid@alpha.com', 'invalid-email'], enabled: true });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid email address format');
    });

    it('updates and persists settings successfully for ADMIN', async () => {
      (prisma.organizations.update as jest.Mock).mockResolvedValue({ id: orgId });

      const res = await request(app)
        .put('/api/v1/organizations/email-alerts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          recipients: ['security@alpha.com', 'soc@alpha.com'],
          enabled: true,
          severityFilter: 'medium_and_high',
          hourlyRateLimit: 25,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.recipients).toEqual(['security@alpha.com', 'soc@alpha.com']);
      expect(res.body.data.enabled).toBe(true);
      expect(res.body.data.severityFilter).toBe('medium_and_high');
      expect(res.body.data.hourlyRateLimit).toBe(25);

      expect(prisma.organizations.update).toHaveBeenCalledWith({
        where: { id: orgId },
        data: expect.objectContaining({
          alertEmail: expect.stringContaining('"recipients":["security@alpha.com","soc@alpha.com"]'),
        }),
      });
    });
  });

  describe('POST /api/v1/organizations/email-alerts/test', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await request(app).post('/api/v1/organizations/email-alerts/test');
      expect(res.status).toBe(401);
    });

    it('returns 403 when user is not an ADMIN', async () => {
      const res = await request(app)
        .post('/api/v1/organizations/email-alerts/test')
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(res.status).toBe(403);
    });

    it('returns 400 when no recipients are configured and none provided', async () => {
      (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
        id: orgId,
        name: 'Alpha Corp',
        alertEmail: null,
      });

      const res = await request(app)
        .post('/api/v1/organizations/email-alerts/test')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('No email alert recipients configured');
    });

    it('sends test email alert successfully when configured', async () => {
      (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
        id: orgId,
        name: 'Alpha Corp',
        alertEmail: JSON.stringify({
          recipients: ['alerts@alpha.com'],
          enabled: true,
          severityFilter: 'high',
          hourlyRateLimit: 10,
        }),
      });

      const res = await request(app)
        .post('/api/v1/organizations/email-alerts/test')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.recipients).toEqual(['a***@alpha.com']);
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockSendMail.mock.calls[0][0].to).toEqual(['alerts@alpha.com']);
      expect(mockSendMail.mock.calls[0][0].subject).toContain('Test Alert for Alpha Corp');
    });

    it('allows testing with an explicit recipient address in body', async () => {
      (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
        id: orgId,
        name: 'Alpha Corp',
      });

      const res = await request(app)
        .post('/api/v1/organizations/email-alerts/test')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ recipient: 'custom-test@alpha.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['custom-test@alpha.com'],
        })
      );
    });
  });
});

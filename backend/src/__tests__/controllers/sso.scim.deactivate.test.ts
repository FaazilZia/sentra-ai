import express from 'express';
import request from 'supertest';
import prisma from '../../config/db';
import { auditLogger } from '../../utils/auditLogger';
import {
  deleteScimUser,
  updateScimUser,
  patchScimUser,
  revokeUserSessions,
} from '../../controllers/sso.controller';
import { authenticate } from '../../middleware/auth.middleware';
import * as jwtUtil from '../../utils/jwt';
import ssoRouter from '../../routes/sso.routes';

jest.mock('../../middleware/auth.middleware', () => {
  const actual = jest.requireActual('../../middleware/auth.middleware');
  return {
    ...actual,
    authenticateScim: jest.fn((req: any, res: any, next: any) => {
      req.user = { organizationId: 'org-scim-deact' };
      next();
    }),
  };
});

jest.mock('../../config/db', () => ({
  __esModule: true,
  default: {
    organizations: { findUnique: jest.fn() },
    users: { findFirst: jest.fn(), update: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
    refreshToken: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    login_sessions: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
    jwt_blacklist: { findUnique: jest.fn() },
  },
}));

jest.mock('../../utils/auditLogger', () => ({
  auditLogger: { log: jest.fn().mockResolvedValue(undefined) },
}));

const mockRedis = {
  get: jest.fn(),
  set: jest.fn().mockResolvedValue('OK'),
};

jest.mock('../../config/redis', () => ({
  getRedisClient: jest.fn(() => mockRedis),
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('SCIM Deactivation Routes & Session Invalidation', () => {
  const ORG_ID = 'org-scim-deact';
  const USER_ID = 'user-to-deactivate';

  const makeReq = (params: any = {}, body: any = {}) => ({
    user: { organizationId: ORG_ID },
    params,
    body,
    headers: {},
  } as any);

  const makeRes = () => {
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
    };
    return res;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
      id: ORG_ID,
      sso_enabled: true,
    });
    (prisma.users.findFirst as jest.Mock).mockResolvedValue({
      id: USER_ID,
      email: 'employee@acme.com',
      full_name: 'Active Employee',
      is_active: true,
      organizationId: ORG_ID,
    });
    (prisma.users.update as jest.Mock).mockImplementation(async ({ data }: any) => ({
      id: USER_ID,
      email: 'employee@acme.com',
      full_name: data.full_name || 'Active Employee',
      is_active: data.is_active !== undefined ? data.is_active : false,
      organizationId: ORG_ID,
    }));
  });

  describe('revokeUserSessions', () => {
    it('revokes refresh tokens, deletes login sessions, and sets Redis user blacklist', async () => {
      await revokeUserSessions(USER_ID);

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        data: { revoked: true },
      });
      expect(prisma.login_sessions.deleteMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
      });
      expect(mockRedis.set).toHaveBeenCalledWith(
        `blacklist:user:${USER_ID}`,
        '1',
        'EX',
        86400
      );
    });
  });

  describe('DELETE /scim/v2/Users/:id', () => {
    it('soft-deletes user, writes SCIM_USER_DEACTIVATED audit log, and revokes sessions', async () => {
      const req = makeReq({ id: USER_ID });
      const res = makeRes();
      const next = jest.fn();

      await deleteScimUser(req, res, next);

      expect(prisma.users.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { is_active: false },
      });
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'scim_agent',
          organizationId: ORG_ID,
          action: 'SCIM_USER_DEACTIVATED',
          metadata: { userId: USER_ID },
        })
      );
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        data: { revoked: true },
      });
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.end).toHaveBeenCalled();
    });
  });

  describe('PUT /scim/v2/Users/:id', () => {
    it('deactivates user when active is false, logs SCIM_USER_DEACTIVATED, and revokes sessions', async () => {
      const req = makeReq({ id: USER_ID }, {
        name: { formatted: 'Updated Employee' },
        active: false,
      });
      const res = makeRes();
      const next = jest.fn();

      await updateScimUser(req, res, next);

      expect(prisma.users.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { full_name: 'Updated Employee', is_active: false },
      });
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'scim_agent',
          organizationId: ORG_ID,
          action: 'SCIM_USER_DEACTIVATED',
          metadata: { userId: USER_ID },
        })
      );
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        data: { revoked: true },
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('supports name.givenName and name.familyName fallback', async () => {
      const req = makeReq({ id: USER_ID }, {
        name: { givenName: 'John', familyName: 'Doe' },
        active: true,
      });
      const res = makeRes();

      await updateScimUser(req, res, jest.fn());

      expect(prisma.users.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { full_name: 'John Doe', is_active: true },
      });
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SCIM_USER_UPDATED' })
      );
    });
  });

  describe('PATCH /scim/v2/Users/:id (Okta Form A & Form B)', () => {
    it('Form A: handles op replace, path "active" with boolean false', async () => {
      const req = makeReq({ id: USER_ID }, {
        Operations: [
          { op: 'replace', path: 'active', value: false },
        ],
      });
      const res = makeRes();

      await patchScimUser(req, res, jest.fn());

      expect(prisma.users.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { is_active: false },
      });
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SCIM_USER_DEACTIVATED',
          metadata: { userId: USER_ID },
        })
      );
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        data: { revoked: true },
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('Form A: handles case-insensitive op "Replace" and path "Active" with string "false"', async () => {
      const req = makeReq({ id: USER_ID }, {
        Operations: [
          { op: 'Replace', path: 'Active', value: 'false' },
        ],
      });
      const res = makeRes();

      await patchScimUser(req, res, jest.fn());

      expect(prisma.users.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { is_active: false },
      });
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SCIM_USER_DEACTIVATED' })
      );
      expect(mockRedis.set).toHaveBeenCalledWith(`blacklist:user:${USER_ID}`, '1', 'EX', 86400);
    });

    it('Form B: handles op replace with NO path and value {"active": false}', async () => {
      const req = makeReq({ id: USER_ID }, {
        Operations: [
          { op: 'replace', value: { active: false } },
        ],
      });
      const res = makeRes();

      await patchScimUser(req, res, jest.fn());

      expect(prisma.users.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { is_active: false },
      });
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SCIM_USER_DEACTIVATED',
          metadata: { userId: USER_ID },
        })
      );
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        data: { revoked: true },
      });
    });

    it('Form B: handles case-insensitive {"Active": false} with op "replace"', async () => {
      const req = makeReq({ id: USER_ID }, {
        Operations: [
          { op: 'replace', value: { Active: false } },
        ],
      });
      const res = makeRes();

      await patchScimUser(req, res, jest.fn());

      expect(prisma.users.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { is_active: false },
      });
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SCIM_USER_DEACTIVATED' })
      );
    });

    it('Form B: handles array-wrapped value [{ active: "false" }] with op "replace"', async () => {
      const req = makeReq({ id: USER_ID }, {
        Operations: [
          { op: 'replace', value: [{ active: 'false' }] },
        ],
      });
      const res = makeRes();

      await patchScimUser(req, res, jest.fn());

      expect(prisma.users.update).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { is_active: false },
      });
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SCIM_USER_DEACTIVATED' })
      );
    });
  });

  describe('JWT Session Invalidation for Deactivated Users', () => {
    it('blocks an already logged-in deactivated user at authenticate middleware', async () => {
      const validToken = 'mocked-jwt-token';
      jest.spyOn(jwtUtil, 'verifyAccessToken').mockReturnValue({
        id: USER_ID,
        role: 'MEMBER',
        organizationId: ORG_ID,
        iat: Math.floor(Date.now() / 1000) - 60,
      } as any);

      // User exists in DB but is_active is false
      (prisma.users.findUnique as jest.Mock).mockResolvedValue({
        id: USER_ID,
        email: 'employee@acme.com',
        is_active: false,
        role: 'MEMBER',
        organizationId: ORG_ID,
        organizations: { is_active: true },
      });

      const req: any = {
        headers: { authorization: `Bearer ${validToken}` },
        cookies: {},
      };
      const res = makeRes();
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'User account has been deactivated',
        })
      );
    });

    it('blocks user immediately when Redis has blacklist:user:id key', async () => {
      const validToken = 'mocked-jwt-token';
      jest.spyOn(jwtUtil, 'verifyAccessToken').mockReturnValue({
        id: USER_ID,
        role: 'MEMBER',
        organizationId: ORG_ID,
      } as any);

      mockRedis.get.mockImplementation(async (key: string) => {
        if (key === `blacklist:user:${USER_ID}`) return '1';
        return null;
      });

      const req: any = {
        headers: { authorization: `Bearer ${validToken}` },
        cookies: {},
      };
      const res = makeRes();
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Invalid or expired credentials',
        })
      );
    });
  });
describe('SCIM Route-specific Body Parser (application/scim+json)', () => {
    let testApp: express.Express;

    beforeAll(() => {
      testApp = express();
      testApp.use('/api/v1', ssoRouter);
    });

    it('parses application/scim+json payload and passes structured body to createScimUser', async () => {
      (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
        id: ORG_ID,
        sso_enabled: true,
      });
      (prisma.users.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.users.create as jest.Mock).mockImplementation(async ({ data }: any) => ({
        id: 'new-scim-user-123',
        ...data,
      }));

      const scimUserPayload = {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
        userName: 'provisioned.user@okta.com',
        name: {
          givenName: 'Provisioned',
          familyName: 'User',
        },
        emails: [{ value: 'provisioned.user@okta.com', primary: true }],
        active: true,
      };

      const res = await request(testApp)
        .post('/api/v1/scim/v2/Users')
        .set('Content-Type', 'application/scim+json')
        .send(JSON.stringify(scimUserPayload));

      expect(res.status).toBe(201);
      expect(res.headers['content-type']).toMatch(/application\/scim\+json/);
      expect(typeof res.body.id).toBe('string');
      expect(res.body.userName).toBe('provisioned.user@okta.com');
      expect(res.body.active).toBe(true);

      // Verify that createScimUser received and processed the parsed body fields
      expect(prisma.users.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'provisioned.user@okta.com',
            full_name: 'Provisioned User',
            is_active: true,
            organizationId: ORG_ID,
          }),
        })
      );
    });

    it('parses application/scim+json payload and passes structured body to patchScimUser for deactivation', async () => {
      (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
        id: ORG_ID,
        sso_enabled: true,
      });
      (prisma.users.findFirst as jest.Mock).mockImplementation(async (args: any) => {
        if (args?.where?.role === 'ADMIN') {
          return {
            id: ADMIN_ACTOR_ID,
            email: 'admin@acme.com',
            full_name: 'Admin Actor',
            role: 'ADMIN',
            is_active: true,
            organizationId: ORG_ID,
          };
        }
        return {
          id: 'user-to-patch',
          email: 'patch.user@okta.com',
          full_name: 'Patch User',
          is_active: true,
          organizationId: ORG_ID,
        };
      });
      (prisma.users.update as jest.Mock).mockImplementation(async ({ data }: any) => ({
        id: 'user-to-patch',
        email: 'patch.user@okta.com',
        full_name: 'Patch User',
        is_active: data.is_active !== undefined ? data.is_active : false,
        organizationId: ORG_ID,
      }));

      const scimPatchPayload = {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
        Operations: [
          {
            op: 'replace',
            path: 'active',
            value: false,
          },
        ],
      };

      const res = await request(testApp)
        .patch('/api/v1/scim/v2/Users/user-to-patch')
        .set('Content-Type', 'application/scim+json')
        .send(JSON.stringify(scimPatchPayload));

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/scim\+json/);
      expect(res.body.active).toBe(false);

      expect(prisma.users.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-to-patch' },
          data: expect.objectContaining({
            is_active: false,
          }),
        })
      );
    });

    it('negative case: returns 400 Bad Request when application/scim+json body is missing required username/email', async () => {
      (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
        id: ORG_ID,
        sso_enabled: true,
      });

      const invalidPayload = {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
        name: { givenName: 'NoEmailUser' },
        active: true,
      };

      const res = await request(testApp)
        .post('/api/v1/scim/v2/Users')
        .set('Content-Type', 'application/scim+json')
        .send(JSON.stringify(invalidPayload));

      expect(res.status).toBe(400);
      expect(res.headers['content-type']).toMatch(/application\/scim\+json/);
      expect(res.body).toMatchObject({
        schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
        status: '400',
        detail: 'Username/Email is required',
      });
      expect(prisma.users.create).not.toHaveBeenCalled();
    });
  });
});

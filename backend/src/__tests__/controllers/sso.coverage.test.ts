import { Request, Response } from 'express';
import prisma from '../../config/db';
import {
  initiateSamlSso,
  getScimUsers,
  getScimUserById,
  createScimUser,
  updateScimUser,
  deleteScimUser,
  patchScimUser,
  getScimGroups,
  getScimGroupById,
  createScimGroup,
  updateScimGroup,
  patchScimGroup,
  deleteScimGroup,
  getServiceProviderConfig,
  getResourceTypes,
  getSchemas,
} from '../../controllers/sso.controller';
import { authenticateScim } from '../../middleware/auth.middleware';
import * as encryption from '../../utils/encryption';

jest.mock('../../config/db', () => ({
  __esModule: true,
  default: {
    organizations: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    users: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    refreshToken: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    login_sessions: {
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  },
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../utils/auditLogger', () => ({
  auditLogger: {
    log: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('SSO & SCIM High Coverage Test Suite', () => {
  const ORG_ID = 'test-org-coverage';
  const ORG_SLUG = 'coverage-slug';

  const makeMockRes = () => {
    const res: any = {
      statusCode: 200,
      headers: {},
      body: null,
      redirectUrl: null,
      status: jest.fn().mockImplementation((code: number) => {
        res.statusCode = code;
        return res;
      }),
      type: jest.fn().mockImplementation((t: string) => {
        res.headers['content-type'] = t;
        return res;
      }),
      json: jest.fn().mockImplementation((data: any) => {
        res.body = data;
        return res;
      }),
      send: jest.fn().mockImplementation((data: any) => {
        res.body = data;
        return res;
      }),
      end: jest.fn().mockImplementation(() => res),
      redirect: jest.fn().mockImplementation((url: string) => {
        res.redirectUrl = url;
        return res;
      }),
      setHeader: jest.fn().mockImplementation((k: string, v: string) => {
        res.headers[k.toLowerCase()] = v;
        return res;
      }),
    };
    return res;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initiateSamlSso', () => {
    it('returns 404 when organization is not found', async () => {
      (prisma.organizations.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { orgSlug: 'unknown' } };
      const res = makeMockRes();
      await initiateSamlSso(req, res, jest.fn());
      expect(res.statusCode).toBe(404);
    });

    it('returns 501 when SSO is not enabled', async () => {
      (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
        id: ORG_ID,
        slug: ORG_SLUG,
        sso_enabled: false,
      });
      const req: any = { params: { orgSlug: ORG_SLUG } };
      const res = makeMockRes();
      await initiateSamlSso(req, res, jest.fn());
      expect(res.statusCode).toBe(501);
    });

    it('returns 400 when IdP metadata XML is not configured', async () => {
      (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
        id: ORG_ID,
        slug: ORG_SLUG,
        sso_enabled: true,
        saml_metadata: null,
      });
      const req: any = { params: { orgSlug: ORG_SLUG } };
      const res = makeMockRes();
      await initiateSamlSso(req, res, jest.fn());
      expect(res.statusCode).toBe(400);
    });
  });

  describe('getScimUsers', () => {
    it('returns 401 when organizationId is missing', async () => {
      const req: any = { user: {} };
      const res = makeMockRes();
      await getScimUsers(req, res, jest.fn());
      expect(res.statusCode).toBe(401);
      expect(res.body.schemas).toContain('urn:ietf:params:scim:api:messages:2.0:Error');
    });

    it('returns 501 when SSO is disabled for org', async () => {
      (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
        id: ORG_ID,
        sso_enabled: false,
      });
      const req: any = { user: { organizationId: ORG_ID }, query: {} };
      const res = makeMockRes();
      await getScimUsers(req, res, jest.fn());
      expect(res.statusCode).toBe(501);
    });

    it('returns 200 with users filtered by userName', async () => {
      (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
        id: ORG_ID,
        sso_enabled: true,
      });
      (prisma.users.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'u-1',
          email: 'filtered@acme.com',
          full_name: 'Filtered User',
          is_active: true,
        },
      ]);

      const req: any = {
        user: { organizationId: ORG_ID },
        query: { filter: 'userName eq "filtered@acme.com"' },
      };
      const res = makeMockRes();
      await getScimUsers(req, res, jest.fn());

      expect(res.statusCode).toBe(200);
      expect(res.body.totalResults).toBe(1);
      expect(res.body.Resources[0].userName).toBe('filtered@acme.com');
    });
  });

  describe('getScimUserById', () => {
    it('returns 401 when organizationId is missing', async () => {
      const req: any = { user: {}, params: { id: 'u-1' } };
      const res = makeMockRes();
      await getScimUserById(req, res, jest.fn());
      expect(res.statusCode).toBe(401);
    });

    it('returns 404 when user is not found', async () => {
      (prisma.users.findFirst as jest.Mock).mockResolvedValue(null);
      const req: any = { user: { organizationId: ORG_ID }, params: { id: 'u-none' } };
      const res = makeMockRes();
      await getScimUserById(req, res, jest.fn());
      expect(res.statusCode).toBe(404);
      expect(res.body.schemas).toContain('urn:ietf:params:scim:api:messages:2.0:Error');
    });

    it('returns 200 with user resource', async () => {
      (prisma.users.findFirst as jest.Mock).mockResolvedValue({
        id: 'u-1',
        email: 'user1@acme.com',
        full_name: 'User One',
        is_active: true,
      });
      const req: any = { user: { organizationId: ORG_ID }, params: { id: 'u-1' } };
      const res = makeMockRes();
      await getScimUserById(req, res, jest.fn());
      expect(res.statusCode).toBe(200);
      expect(res.body.userName).toBe('user1@acme.com');
    });
  });

  describe('createScimUser error paths', () => {
    it('returns 401 when organizationId is missing', async () => {
      const req: any = { user: {}, body: {} };
      const res = makeMockRes();
      await createScimUser(req, res, jest.fn());
      expect(res.statusCode).toBe(401);
    });

    it('returns 501 when SSO is disabled', async () => {
      (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
        id: ORG_ID,
        sso_enabled: false,
      });
      const req: any = { user: { organizationId: ORG_ID }, body: { userName: 'test@acme.com' } };
      const res = makeMockRes();
      await createScimUser(req, res, jest.fn());
      expect(res.statusCode).toBe(501);
    });

    it('returns 400 when userName and emails are missing', async () => {
      (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
        id: ORG_ID,
        sso_enabled: true,
      });
      const req: any = { user: { organizationId: ORG_ID }, body: {} };
      const res = makeMockRes();
      await createScimUser(req, res, jest.fn());
      expect(res.statusCode).toBe(400);
      expect(res.body.detail).toBe('Username/Email is required');
    });

    it('returns 409 when user already exists', async () => {
      (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
        id: ORG_ID,
        sso_enabled: true,
      });
      (prisma.users.findUnique as jest.Mock).mockResolvedValue({ id: 'existing-id' });

      const req: any = {
        user: { organizationId: ORG_ID },
        body: { userName: 'existing@acme.com' },
      };
      const res = makeMockRes();
      await createScimUser(req, res, jest.fn());
      expect(res.statusCode).toBe(409);
      expect(res.body.detail).toBe('User already exists');
    });
  });

  describe('updateScimUser & deleteScimUser error paths', () => {
    it('updateScimUser returns 401 without organizationId', async () => {
      const req: any = { user: {}, params: { id: 'u-1' }, body: {} };
      const res = makeMockRes();
      await updateScimUser(req, res, jest.fn());
      expect(res.statusCode).toBe(401);
    });

    it('updateScimUser returns 501 when SSO is disabled', async () => {
      (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({ id: ORG_ID, sso_enabled: false });
      const req: any = { user: { organizationId: ORG_ID }, params: { id: 'u-1' }, body: {} };
      const res = makeMockRes();
      await updateScimUser(req, res, jest.fn());
      expect(res.statusCode).toBe(501);
    });

    it('updateScimUser returns 404 when user not found', async () => {
      (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({ id: ORG_ID, sso_enabled: true });
      (prisma.users.findFirst as jest.Mock).mockResolvedValue(null);
      const req: any = { user: { organizationId: ORG_ID }, params: { id: 'u-none' }, body: {} };
      const res = makeMockRes();
      await updateScimUser(req, res, jest.fn());
      expect(res.statusCode).toBe(404);
      expect(res.body.detail).toBe('User not found');
    });

    it('deleteScimUser returns 401 without organizationId', async () => {
      const req: any = { user: {}, params: { id: 'u-1' } };
      const res = makeMockRes();
      await deleteScimUser(req, res, jest.fn());
      expect(res.statusCode).toBe(401);
    });

    it('deleteScimUser returns 501 when SSO disabled', async () => {
      (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({ id: ORG_ID, sso_enabled: false });
      const req: any = { user: { organizationId: ORG_ID }, params: { id: 'u-1' } };
      const res = makeMockRes();
      await deleteScimUser(req, res, jest.fn());
      expect(res.statusCode).toBe(501);
    });

    it('deleteScimUser returns 404 when user not found', async () => {
      (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({ id: ORG_ID, sso_enabled: true });
      (prisma.users.findFirst as jest.Mock).mockResolvedValue(null);
      const req: any = { user: { organizationId: ORG_ID }, params: { id: 'u-none' } };
      const res = makeMockRes();
      await deleteScimUser(req, res, jest.fn());
      expect(res.statusCode).toBe(404);
    });
  });

  describe('patchScimUser extra branches', () => {
    it('returns 401 when organizationId is missing', async () => {
      const req: any = { user: {}, params: { id: 'u-1' }, body: {} };
      const res = makeMockRes();
      await patchScimUser(req, res, jest.fn());
      expect(res.statusCode).toBe(401);
    });

    it('returns 404 when user is not found', async () => {
      (prisma.users.findFirst as jest.Mock).mockResolvedValue(null);
      const req: any = { user: { organizationId: ORG_ID }, params: { id: 'u-none' }, body: { Operations: [] } };
      const res = makeMockRes();
      await patchScimUser(req, res, jest.fn());
      expect(res.statusCode).toBe(404);
    });

    it('returns 400 when Operations is not an array', async () => {
      (prisma.users.findFirst as jest.Mock).mockResolvedValue({ id: 'u-1', organizationId: ORG_ID });
      const req: any = { user: { organizationId: ORG_ID }, params: { id: 'u-1' }, body: { Operations: 'invalid' } };
      const res = makeMockRes();
      await patchScimUser(req, res, jest.fn());
      expect(res.statusCode).toBe(400);
      expect(res.body.detail).toBe('Invalid operations format');
    });

    it('updates name using path "name.formatted" and path "name"', async () => {
      (prisma.users.findFirst as jest.Mock).mockImplementation(async (args: any) => {
        if (args?.where?.role === 'ADMIN') {
          return { id: 'admin-id', organizationId: ORG_ID, role: 'ADMIN', is_active: true };
        }
        return { id: 'u-1', organizationId: ORG_ID, full_name: 'Old Name', is_active: true };
      });
      (prisma.users.update as jest.Mock).mockResolvedValue({
        id: 'u-1',
        email: 'u1@acme.com',
        full_name: 'Brand New Name',
        is_active: true,
      });

      const req: any = {
        user: { organizationId: ORG_ID },
        params: { id: 'u-1' },
        body: {
          Operations: [
            { op: 'replace', path: 'name.formatted', value: 'Brand New Name' },
            { op: 'replace', path: 'name', value: { formatted: 'Brand New Name' } },
            { op: 'replace', value: { name: { givenName: 'Brand', familyName: 'New' } } },
          ],
        },
      };
      const res = makeMockRes();
      await patchScimUser(req, res, jest.fn());
      expect(res.statusCode).toBe(200);
    });
  });

  describe('SCIM Groups controller methods', () => {
    it('getScimGroups returns 401 when organizationId is missing', async () => {
      const req: any = { user: {} };
      const res = makeMockRes();
      await getScimGroups(req, res, jest.fn());
      expect(res.statusCode).toBe(401);
    });

    it('getScimGroups returns 200 with 5 groups mapped to system roles', async () => {
      (prisma.users.findMany as jest.Mock).mockResolvedValue([
        { id: 'u-admin-1', full_name: 'Admin One' },
      ]);
      const req: any = { user: { organizationId: ORG_ID } };
      const res = makeMockRes();
      await getScimGroups(req, res, jest.fn());
      expect(res.statusCode).toBe(200);
      expect(res.body.totalResults).toBe(5);
      expect(res.body.Resources).toHaveLength(5);
    });

    it('getScimGroupById returns 401 without organizationId', async () => {
      const req: any = { user: {}, params: { id: 'admin' } };
      const res = makeMockRes();
      await getScimGroupById(req, res, jest.fn());
      expect(res.statusCode).toBe(401);
    });

    it('getScimGroupById returns 404 for invalid group name', async () => {
      const req: any = { user: { organizationId: ORG_ID }, params: { id: 'super_admin' } };
      const res = makeMockRes();
      await getScimGroupById(req, res, jest.fn());
      expect(res.statusCode).toBe(404);
      expect(res.body.detail).toBe('Group not found');
    });

    it('getScimGroupById returns 200 for valid role "engineer"', async () => {
      (prisma.users.findMany as jest.Mock).mockResolvedValue([
        { id: 'u-eng-1', full_name: 'Engineer One' },
      ]);
      const req: any = { user: { organizationId: ORG_ID }, params: { id: 'engineer' } };
      const res = makeMockRes();
      await getScimGroupById(req, res, jest.fn());
      expect(res.statusCode).toBe(200);
      expect(res.body.displayName).toBe('ENGINEER');
    });

    it('createScimGroup returns 401 without organizationId', async () => {
      const req: any = { user: {}, body: {} };
      const res = makeMockRes();
      await createScimGroup(req, res, jest.fn());
      expect(res.statusCode).toBe(401);
    });

    it('createScimGroup returns 400 for unmapped role', async () => {
      const req: any = { user: { organizationId: ORG_ID }, body: { displayName: 'UNKNOWN_ROLE' } };
      const res = makeMockRes();
      await createScimGroup(req, res, jest.fn());
      expect(res.statusCode).toBe(400);
      expect(res.body.schemas).toContain('urn:ietf:params:scim:api:messages:2.0:Error');
    });

    it('createScimGroup returns 201 for valid group and updates user roles', async () => {
      (prisma.users.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      const req: any = {
        user: { organizationId: ORG_ID },
        body: {
          displayName: 'ENGINEER',
          members: [{ value: 'u-eng-1' }],
        },
      };
      const res = makeMockRes();
      await createScimGroup(req, res, jest.fn());
      expect(res.statusCode).toBe(201);
      expect(res.body.displayName).toBe('ENGINEER');
      expect(prisma.users.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['u-eng-1'] }, organizationId: ORG_ID },
        data: { role: 'ENGINEER' },
      });
    });

    it('updateScimGroup returns 401 without organizationId', async () => {
      const req: any = { user: {}, params: { id: 'admin' }, body: {} };
      const res = makeMockRes();
      await updateScimGroup(req, res, jest.fn());
      expect(res.statusCode).toBe(401);
    });

    it('updateScimGroup returns 400 for unknown role', async () => {
      const req: any = {
        user: { organizationId: ORG_ID },
        params: { id: 'unknown' },
        body: { displayName: 'unknown' },
      };
      const res = makeMockRes();
      await updateScimGroup(req, res, jest.fn());
      expect(res.statusCode).toBe(400);
    });

    it('updateScimGroup demotes old members to VIEWER and sets new members', async () => {
      (prisma.users.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      const req: any = {
        user: { organizationId: ORG_ID },
        params: { id: 'admin' },
        body: {
          displayName: 'ADMIN',
          members: [{ value: 'u-new-admin' }],
        },
      };
      const res = makeMockRes();
      await updateScimGroup(req, res, jest.fn());
      expect(res.statusCode).toBe(200);
      expect(prisma.users.updateMany).toHaveBeenCalledWith({
        where: { organizationId: ORG_ID, role: 'ADMIN' },
        data: { role: 'VIEWER' },
      });
      expect(prisma.users.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['u-new-admin'] }, organizationId: ORG_ID },
        data: { role: 'ADMIN' },
      });
    });

    it('patchScimGroup handles add, remove, and replace operations', async () => {
      (prisma.users.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.users.findMany as jest.Mock).mockResolvedValue([
        { id: 'u-auditor-1', full_name: 'Auditor One' },
      ]);

      const req: any = {
        user: { organizationId: ORG_ID },
        params: { id: 'auditor' },
        body: {
          Operations: [
            { op: 'add', value: [{ value: 'u-aud-add' }] },
            { op: 'remove', value: [{ value: 'u-aud-rem' }] },
            { op: 'remove', value: null },
            { op: 'replace', value: [{ value: 'u-aud-rep' }] },
          ],
        },
      };
      const res = makeMockRes();
      await patchScimGroup(req, res, jest.fn());
      expect(res.statusCode).toBe(200);
      expect(res.body.displayName).toBe('AUDITOR');
    });

    it('patchScimGroup returns 400 when role is invalid or Operations is missing', async () => {
      const req1: any = { user: { organizationId: ORG_ID }, params: { id: 'fake_role' }, body: {} };
      const res1 = makeMockRes();
      await patchScimGroup(req1, res1, jest.fn());
      expect(res1.statusCode).toBe(400);

      const req2: any = { user: { organizationId: ORG_ID }, params: { id: 'admin' }, body: {} };
      const res2 = makeMockRes();
      await patchScimGroup(req2, res2, jest.fn());
      expect(res2.statusCode).toBe(400);
    });

    it('deleteScimGroup demotes role members to VIEWER and returns 204', async () => {
      (prisma.users.updateMany as jest.Mock).mockResolvedValue({ count: 2 });
      const req: any = { user: { organizationId: ORG_ID }, params: { id: 'engineer' } };
      const res = makeMockRes();
      await deleteScimGroup(req, res, jest.fn());
      expect(res.statusCode).toBe(204);
      expect(prisma.users.updateMany).toHaveBeenCalledWith({
        where: { organizationId: ORG_ID, role: 'ENGINEER' },
        data: { role: 'VIEWER' },
      });
    });

    it('deleteScimGroup returns 404 for unmapped role', async () => {
      const req: any = { user: { organizationId: ORG_ID }, params: { id: 'fake_role' } };
      const res = makeMockRes();
      await deleteScimGroup(req, res, jest.fn());
      expect(res.statusCode).toBe(404);
    });
  });

  describe('SCIM Discovery Endpoints', () => {
    it('getServiceProviderConfig returns RFC 7644 config', async () => {
      const res = makeMockRes();
      await getServiceProviderConfig({} as any, res, jest.fn());
      expect(res.statusCode).toBe(200);
      expect(res.body.schemas).toContain('urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig');
      expect(res.body.patch.supported).toBe(true);
    });

    it('getResourceTypes returns User and Group resource types', async () => {
      const res = makeMockRes();
      await getResourceTypes({} as any, res, jest.fn());
      expect(res.statusCode).toBe(200);
      expect(res.body.Resources).toHaveLength(2);
    });

    it('getSchemas returns core User and Group schemas', async () => {
      const res = makeMockRes();
      await getSchemas({} as any, res, jest.fn());
      expect(res.statusCode).toBe(200);
      expect(res.body.Resources).toHaveLength(2);
    });
  });

  describe('authenticateScim middleware', () => {
    it('returns 401 when Authorization header is missing or not Bearer', async () => {
      const req1: any = { headers: {} };
      const res1 = makeMockRes();
      await authenticateScim(req1, res1, jest.fn());
      expect(res1.statusCode).toBe(401);
      expect(res1.body.detail).toBe('Authentication required');

      const req2: any = { headers: { authorization: 'Basic 12345' } };
      const res2 = makeMockRes();
      await authenticateScim(req2, res2, jest.fn());
      expect(res2.statusCode).toBe(401);
    });

    it('returns 401 when Bearer token is empty', async () => {
      const req: any = { headers: { authorization: 'Bearer ' } };
      const res = makeMockRes();
      await authenticateScim(req, res, jest.fn());
      expect(res.statusCode).toBe(401);
      expect(res.body.detail).toBe('Authentication required');
    });

    it('returns 401 when no organization matches the token', async () => {
      (prisma.organizations.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'org-1',
          sso_enabled: true,
          saml_metadata: { scimBearerToken: 'diff-token' },
        },
      ]);
      const req: any = { headers: { authorization: 'Bearer my-token' } };
      const res = makeMockRes();
      await authenticateScim(req, res, jest.fn());
      expect(res.statusCode).toBe(401);
      expect(res.body.detail).toBe('Invalid SCIM credentials');
    });

    it('authenticates successfully with decrypted or plaintext SCIM token', async () => {
      const RAW_TOKEN = 'scim-valid-bearer-token';
      const encrypted = encryption.encrypt(RAW_TOKEN);

      (prisma.organizations.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'org-auth-success',
          sso_enabled: true,
          saml_metadata: { scimBearerToken: encrypted },
        },
      ]);

      const req: any = { headers: { authorization: `Bearer ${RAW_TOKEN}` } };
      const res = makeMockRes();
      const next = jest.fn();

      await authenticateScim(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.user.organizationId).toBe('org-auth-success');
    });

    it('catches unexpected database errors and returns 401 RFC 7644', async () => {
      (prisma.organizations.findMany as jest.Mock).mockRejectedValue(new Error('DB disconnect'));
      const req: any = { headers: { authorization: 'Bearer some-token' } };
      const res = makeMockRes();
      await authenticateScim(req, res, jest.fn());
      expect(res.statusCode).toBe(401);
      expect(res.body.detail).toBe('Invalid or expired SCIM credentials');
    });
  });
});

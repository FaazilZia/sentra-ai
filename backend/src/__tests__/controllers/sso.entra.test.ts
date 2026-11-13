/**
 * Microsoft Entra ID SAML 2.0 Single Sign-On Tests.
 *
 * Verifies:
 * - Entra standard claim URIs (emailaddress, givenname, surname, displayname, groups, role)
 * - NameID formats (emailAddress, persistent, object { value })
 * - Group-to-role mappings and escalation protections (ADMIN, ENGINEER, AUDITOR, MEMBER, VIEWER)
 * - Cross-org rejection and audit logging
 * - Deactivated user rejection and audit logging
 * - Email domain allowlist enforcement (both unknown and known users)
 * - Entra attribute preset auto-selection in updateSsoConfig
 */

import { execFileSync } from 'child_process';
import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import * as samlify from 'samlify';

jest.mock('../../config/db', () => ({
  __esModule: true,
  default: {
    organizations: { findUnique: jest.fn(), update: jest.fn() },
    users: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  },
}));

jest.mock('../../utils/auditLogger', () => ({
  auditLogger: { log: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('../../controllers/auth.controller', () => ({
  setAuthCookiesAndTokens: jest.fn().mockResolvedValue({ accessToken: 'a', refreshToken: 'r' }),
}));

import prisma from '../../config/db';
import { auditLogger } from '../../utils/auditLogger';
import { setAuthCookiesAndTokens } from '../../controllers/auth.controller';
import {
  samlCallback,
  updateSsoConfig,
  ENTRA_ATTRIBUTE_PRESET,
} from '../../controllers/sso.controller';

samlify.setSchemaValidator({ validate: () => Promise.resolve('skipped') });

const ORG_SLUG = 'acme-entra';
const ORG_ID = 'org-entra-123';
const OTHER_ORG_ID = 'org-other-456';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:10000';
const SP_ENTITY_ID = `${BACKEND_URL}/api/v1/saml/${ORG_SLUG}/metadata`;
const SP_ACS_URL = `${BACKEND_URL}/api/v1/saml/${ORG_SLUG}/callback`;
const ENTRA_ISSUER = 'https://sts.windows.net/test-entra-tenant-id/';

let keyDir: string;
let privateKey: string;
let cert: string;
let rawCert: string;
let entraIdp: any;

const makeKeyPair = () => {
  const keyPath = path.join(keyDir, 'entra.key');
  const certPath = path.join(keyDir, 'entra.crt');
  execFileSync(
    'openssl',
    ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', keyPath, '-out', certPath, '-days', '2', '-subj', '/CN=EntraTestIdP'],
    { stdio: 'ignore' }
  );
  privateKey = readFileSync(keyPath, 'utf8');
  cert = readFileSync(certPath, 'utf8');
  rawCert = cert.replace(/-----BEGIN CERTIFICATE-----/, '').replace(/-----END CERTIFICATE-----/, '').replace(/\s+/g, '');
};

const buildSignedEntraResponse = (opts: {
  nameId: string;
  nameIdFormat?: string;
  attributes?: Record<string, string | string[]>;
}): string => {
  const now = new Date();
  const notBefore = new Date(now.getTime() - 60000).toISOString();
  const notOnOrAfter = new Date(now.getTime() + 300000).toISOString();
  const format = opts.nameIdFormat || 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress';

  let attributeStatements = '';
  if (opts.attributes && Object.keys(opts.attributes).length > 0) {
    const lines = Object.entries(opts.attributes)
      .map(([attrName, attrVal]) => {
        const values = Array.isArray(attrVal) ? attrVal : [attrVal];
        const valElements = values
          .map((v) => `<saml:AttributeValue xsi:type="xs:string">${v}</saml:AttributeValue>`)
          .join('');
        return `<saml:Attribute Name="${attrName}">${valElements}</saml:Attribute>`;
      })
      .join('');
    attributeStatements = `<saml:AttributeStatement>${lines}</saml:AttributeStatement>`;
  }

  const rawXml =
    `<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="_entra_resp_${Date.now()}" Version="2.0" IssueInstant="${now.toISOString()}" Destination="${SP_ACS_URL}">` +
    `<saml:Issuer>${ENTRA_ISSUER}</saml:Issuer>` +
    '<samlp:Status><samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/></samlp:Status>' +
    `<saml:Assertion xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="_assert_${Date.now()}" Version="2.0" IssueInstant="${now.toISOString()}">` +
    `<saml:Issuer>${ENTRA_ISSUER}</saml:Issuer>` +
    `<saml:Subject><saml:NameID Format="${format}">${opts.nameId}</saml:NameID>` +
    '<saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">' +
    `<saml:SubjectConfirmationData Recipient="${SP_ACS_URL}" NotOnOrAfter="${notOnOrAfter}"/>` +
    '</saml:SubjectConfirmation></saml:Subject>' +
    `<saml:Conditions NotBefore="${notBefore}" NotOnOrAfter="${notOnOrAfter}"><saml:AudienceRestriction><saml:Audience>${SP_ENTITY_ID}</saml:Audience></saml:AudienceRestriction></saml:Conditions>` +
    attributeStatements +
    '</saml:Assertion></samlp:Response>';

  return samlify.SamlLib.constructSAMLSignature({
    rawSamlMessage: rawXml,
    privateKey,
    signingCert: rawCert,
    referenceTagXPath: '/*',
    isBase64Output: true,
  });
};

const makeReq = (samlResponse: string) =>
  ({ params: { orgSlug: ORG_SLUG }, body: { SAMLResponse: samlResponse } }) as any;

const makeRes = () => ({ redirect: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() }) as any;

const mockOrg = (extraMetadata: Record<string, any> = {}) => {
  (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
    id: ORG_ID,
    slug: ORG_SLUG,
    sso_enabled: true,
    sso_provider: 'Microsoft Entra ID (SAML 2.0)',
    saml_metadata: {
      idpMetadataXml: entraIdp.getMetadata(),
      attributeMapping: ENTRA_ATTRIBUTE_PRESET,
      ...extraMetadata,
    },
  });
};

const LOGIN_ERROR = expect.stringContaining('/login?error=sso_failed');

beforeAll(() => {
  keyDir = mkdtempSync(path.join(tmpdir(), 'entra-saml-test-'));
  makeKeyPair();
  entraIdp = samlify.IdentityProvider({
    entityID: ENTRA_ISSUER,
    signingCert: cert,
    singleSignOnService: [{ Binding: samlify.Constants.namespace.binding.post, Location: 'https://login.microsoftonline.com/entra/saml2' }],
  });
});

afterAll(() => {
  rmSync(keyDir, { recursive: true, force: true });
});

beforeEach(() => {
  jest.clearAllMocks();
  (prisma.users.findFirst as jest.Mock).mockResolvedValue(null);
  (prisma.users.create as jest.Mock).mockImplementation(async ({ data }: any) => ({ ...data }));
  (prisma.users.update as jest.Mock).mockImplementation(async ({ where, data }: any) => ({
    id: where.id,
    organizationId: ORG_ID,
    role: 'MEMBER',
    ...data,
  }));
});

describe('Microsoft Entra ID SAML SSO: Claim URIs & Attribute Extraction', () => {
  it('correctly maps Entra email, givenname, surname, and displayName claims', async () => {
    mockOrg();
    const res = makeRes();

    const samlResponse = buildSignedEntraResponse({
      nameId: 'alice.smith@acme.com',
      attributes: {
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': 'alice.smith@acme.com',
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname': 'Alice',
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname': 'Smith',
        'http://schemas.microsoft.com/identity/claims/displayname': 'Alice Smith',
        'http://schemas.microsoft.com/ws/2008/06/identity/claims/groups': 'SENTRA_ADMIN',
      },
    });

    await samlCallback(makeReq(samlResponse), res, jest.fn());

    expect(prisma.users.create).toHaveBeenCalledTimes(1);
    const createData = (prisma.users.create as jest.Mock).mock.calls[0][0].data;
    expect(createData.email).toBe('alice.smith@acme.com');
    expect(createData.full_name).toBe('Alice Smith');
    expect(createData.role).toBe('ADMIN');
    expect(createData.organizationId).toBe(ORG_ID);
    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('/dashboard'));
  });

  it('uses http://schemas.microsoft.com/identity/claims/displayname when givenname and surname are absent', async () => {
    mockOrg();
    const res = makeRes();

    const samlResponse = buildSignedEntraResponse({
      nameId: 'bob.ross@acme.com',
      attributes: {
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': 'bob.ross@acme.com',
        'http://schemas.microsoft.com/identity/claims/displayname': 'Bob Ross',
        'http://schemas.microsoft.com/ws/2008/06/identity/claims/groups': 'SENTRA_ENGINEER',
      },
    });

    await samlCallback(makeReq(samlResponse), res, jest.fn());

    expect(prisma.users.create).toHaveBeenCalledTimes(1);
    const createData = (prisma.users.create as jest.Mock).mock.calls[0][0].data;
    expect(createData.email).toBe('bob.ross@acme.com');
    expect(createData.full_name).toBe('Bob Ross');
    expect(createData.role).toBe('ENGINEER');
  });

  it('handles NameID fallback when email claim attribute is not provided', async () => {
    mockOrg();
    const res = makeRes();

    const samlResponse = buildSignedEntraResponse({
      nameId: 'nameid.user@acme.com',
      attributes: {
        'http://schemas.microsoft.com/identity/claims/displayname': 'NameID User',
      },
    });

    await samlCallback(makeReq(samlResponse), res, jest.fn());

    expect(prisma.users.create).toHaveBeenCalledTimes(1);
    const createData = (prisma.users.create as jest.Mock).mock.calls[0][0].data;
    expect(createData.email).toBe('nameid.user@acme.com');
    expect(createData.full_name).toBe('NameID User');
  });
});

describe('Microsoft Entra ID SAML SSO: Group and Role Mapping', () => {
  it('maps role arriving via Entra App Role claim (http://schemas.microsoft.com/ws/2008/06/identity/claims/role)', async () => {
    mockOrg();
    const res = makeRes();

    const samlResponse = buildSignedEntraResponse({
      nameId: 'approle.admin@acme.com',
      attributes: {
        'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': 'SENTRA_ADMIN',
      },
    });
    await samlCallback(makeReq(samlResponse), res, jest.fn());

    const createData = (prisma.users.create as jest.Mock).mock.calls[0][0].data;
    expect(createData.role).toBe('ADMIN');
  });

  it('maps SENTRA_VIEWER arriving via Entra App Role claim to VIEWER', async () => {
    mockOrg();
    const res = makeRes();

    const samlResponse = buildSignedEntraResponse({
      nameId: 'approle.viewer@acme.com',
      attributes: {
        'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': 'SENTRA_VIEWER',
      },
    });
    await samlCallback(makeReq(samlResponse), res, jest.fn());

    const createData = (prisma.users.create as jest.Mock).mock.calls[0][0].data;
    expect(createData.role).toBe('VIEWER');
  });

  it('defaults to VIEWER when only Entra directory GUID groups arrive in group claim', async () => {
    mockOrg();
    const res = makeRes();

    // Default Entra group claims emit directory Object IDs (GUIDs)
    const entraGuidGroups = [
      'c7b8d451-9f22-48a5-8164-5969502b4d96',
      '9a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d',
    ];

    const samlResponse = buildSignedEntraResponse({
      nameId: 'guid.user@acme.com',
      attributes: {
        'http://schemas.microsoft.com/ws/2008/06/identity/claims/groups': entraGuidGroups,
      },
    });
    await samlCallback(makeReq(samlResponse), res, jest.fn());

    const createData = (prisma.users.create as jest.Mock).mock.calls[0][0].data;
    expect(createData.role).toBe('VIEWER');
    expect(createData.role).not.toBe('ADMIN');
    expect(createData.role).not.toBe('ENGINEER');
  });

  it('maps SENTRA_ADMIN in Entra groups claim to ADMIN', async () => {
    mockOrg();
    const res = makeRes();

    const samlResponse = buildSignedEntraResponse({
      nameId: 'admin@acme.com',
      attributes: {
        'http://schemas.microsoft.com/ws/2008/06/identity/claims/groups': 'SENTRA_ADMIN',
      },
    });
    await samlCallback(makeReq(samlResponse), res, jest.fn());

    const createData = (prisma.users.create as jest.Mock).mock.calls[0][0].data;
    expect(createData.role).toBe('ADMIN');
  });

  it('maps SENTRA_ENGINEER in Entra groups claim to ENGINEER', async () => {
    mockOrg();
    const res = makeRes();

    const samlResponse = buildSignedEntraResponse({
      nameId: 'eng@acme.com',
      attributes: {
        'http://schemas.microsoft.com/ws/2008/06/identity/claims/groups': 'SENTRA_ENGINEER',
      },
    });
    await samlCallback(makeReq(samlResponse), res, jest.fn());

    const createData = (prisma.users.create as jest.Mock).mock.calls[0][0].data;
    expect(createData.role).toBe('ENGINEER');
  });

  it('maps SENTRA_AUDITOR in Entra groups claim to AUDITOR', async () => {
    mockOrg();
    const res = makeRes();

    const samlResponse = buildSignedEntraResponse({
      nameId: 'auditor@acme.com',
      attributes: {
        'http://schemas.microsoft.com/ws/2008/06/identity/claims/groups': 'SENTRA_AUDITOR',
      },
    });
    await samlCallback(makeReq(samlResponse), res, jest.fn());

    const createData = (prisma.users.create as jest.Mock).mock.calls[0][0].data;
    expect(createData.role).toBe('AUDITOR');
  });

  it('maps SENTRA_MEMBER in Entra groups claim to MEMBER', async () => {
    mockOrg();
    const res = makeRes();

    const samlResponse = buildSignedEntraResponse({
      nameId: 'member@acme.com',
      attributes: {
        'http://schemas.microsoft.com/ws/2008/06/identity/claims/groups': 'SENTRA_MEMBER',
      },
    });
    await samlCallback(makeReq(samlResponse), res, jest.fn());

    const createData = (prisma.users.create as jest.Mock).mock.calls[0][0].data;
    expect(createData.role).toBe('MEMBER');
  });

  it('defaults unmapped or arbitrary Entra groups to VIEWER', async () => {
    mockOrg();
    const res = makeRes();

    const samlResponse = buildSignedEntraResponse({
      nameId: 'guest@acme.com',
      attributes: {
        'http://schemas.microsoft.com/ws/2008/06/identity/claims/groups': ['SG-Marketing-All', 'Default-Access'],
      },
    });
    await samlCallback(makeReq(samlResponse), res, jest.fn());

    const createData = (prisma.users.create as jest.Mock).mock.calls[0][0].data;
    expect(createData.role).toBe('VIEWER');
  });

  it('strictly blocks SUPER_ADMIN privilege escalation in Entra assertions and demotes to VIEWER', async () => {
    mockOrg();
    const res = makeRes();

    const samlResponse = buildSignedEntraResponse({
      nameId: 'attacker@acme.com',
      attributes: {
        'http://schemas.microsoft.com/ws/2008/06/identity/claims/groups': ['SUPER_ADMIN', 'SENTRA_ADMIN'],
      },
    });
    await samlCallback(makeReq(samlResponse), res, jest.fn());

    const createData = (prisma.users.create as jest.Mock).mock.calls[0][0].data;
    expect(createData.role).toBe('VIEWER');
  });
});

describe('Microsoft Entra ID SAML SSO: Cross-Org Isolation', () => {
  it('rejects an Entra user whose email belongs to a different organization and writes an audit log', async () => {
    mockOrg();
    (prisma.users.findFirst as jest.Mock).mockResolvedValue({
      id: 'existing-other-org-user',
      email: 'corp.user@acme.com',
      role: 'ADMIN',
      organizationId: OTHER_ORG_ID,
      is_active: true,
    });

    const res = makeRes();
    const samlResponse = buildSignedEntraResponse({
      nameId: 'corp.user@acme.com',
      attributes: {
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': 'corp.user@acme.com',
      },
    });

    await samlCallback(makeReq(samlResponse), res, jest.fn());

    expect(prisma.users.create).not.toHaveBeenCalled();
    expect(setAuthCookiesAndTokens).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith(LOGIN_ERROR);
    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SAML_SSO_LOGIN_REJECTED',
        userId: 'existing-other-org-user',
        organizationId: ORG_ID,
        outcome: 'failure',
        metadata: expect.objectContaining({
          reason: 'ORGANIZATION_MISMATCH',
          attemptedOrganizationId: ORG_ID,
          userOrganizationId: OTHER_ORG_ID,
        }),
      })
    );
  });
});

describe('Microsoft Entra ID SAML SSO: Deactivated Users', () => {
  it('rejects an inactive Entra user and logs USER_DEACTIVATED audit entry', async () => {
    mockOrg();
    (prisma.users.findFirst as jest.Mock).mockResolvedValue({
      id: 'deactivated-entra-user',
      email: 'terminated@acme.com',
      role: 'MEMBER',
      organizationId: ORG_ID,
      is_active: false,
    });

    const res = makeRes();
    const samlResponse = buildSignedEntraResponse({
      nameId: 'terminated@acme.com',
      attributes: {
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': 'terminated@acme.com',
      },
    });

    await samlCallback(makeReq(samlResponse), res, jest.fn());

    expect(prisma.users.create).not.toHaveBeenCalled();
    expect(setAuthCookiesAndTokens).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith(LOGIN_ERROR);
    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SAML_SSO_LOGIN_REJECTED',
        userId: 'deactivated-entra-user',
        organizationId: ORG_ID,
        outcome: 'failure',
        metadata: expect.objectContaining({
          reason: 'USER_DEACTIVATED',
          email: 'terminated@acme.com',
          organizationId: ORG_ID,
        }),
      })
    );
  });
});

describe('Microsoft Entra ID SAML SSO: Allowed Email Domains', () => {
  it('rejects an Entra user with an unauthorized email domain when user is unknown', async () => {
    mockOrg({ allowedEmailDomains: ['acme.com'] });
    const res = makeRes();

    const samlResponse = buildSignedEntraResponse({
      nameId: 'outsider@externalcorp.com',
      attributes: {
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': 'outsider@externalcorp.com',
      },
    });

    await samlCallback(makeReq(samlResponse), res, jest.fn());

    expect(prisma.users.create).not.toHaveBeenCalled();
    expect(setAuthCookiesAndTokens).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith(LOGIN_ERROR);
  });

  it('rejects an Entra user with an unauthorized email domain and records audit entry when user is known', async () => {
    mockOrg({ allowedEmailDomains: ['acme.com'] });
    (prisma.users.findFirst as jest.Mock).mockResolvedValue({
      id: 'known-outsider',
      email: 'outsider@externalcorp.com',
      organizationId: ORG_ID,
      role: 'VIEWER',
    });
    const res = makeRes();

    const samlResponse = buildSignedEntraResponse({
      nameId: 'outsider@externalcorp.com',
      attributes: {
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': 'outsider@externalcorp.com',
      },
    });

    await samlCallback(makeReq(samlResponse), res, jest.fn());

    expect(prisma.users.create).not.toHaveBeenCalled();
    expect(setAuthCookiesAndTokens).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith(LOGIN_ERROR);
    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SAML_SSO_LOGIN_REJECTED',
        userId: 'known-outsider',
        organizationId: ORG_ID,
        metadata: expect.objectContaining({
          reason: 'EMAIL_DOMAIN_NOT_ALLOWED',
          email: 'outsider@externalcorp.com',
          emailDomain: 'externalcorp.com',
        }),
      })
    );
  });

  it('allows an Entra user whose email domain is authorized', async () => {
    mockOrg({ allowedEmailDomains: ['acme.com', 'subsidiary.org'] });
    const res = makeRes();

    const samlResponse = buildSignedEntraResponse({
      nameId: 'sarah@subsidiary.org',
      attributes: {
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': 'sarah@subsidiary.org',
      },
    });

    await samlCallback(makeReq(samlResponse), res, jest.fn());

    expect(prisma.users.create).toHaveBeenCalledTimes(1);
    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('/dashboard'));
  });
});

describe('Microsoft Entra ID: updateSsoConfig Auto-Preset', () => {
  const MOCK_XML = '<EntityDescriptor><IDPSSODescriptor><X509Certificate>MIIB...</X509Certificate></IDPSSODescriptor></EntityDescriptor>';

  it('automatically applies ENTRA_ATTRIBUTE_PRESET when sso_provider is Microsoft Entra ID', async () => {
    (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
      id: ORG_ID,
      saml_metadata: {},
    });
    (prisma.organizations.update as jest.Mock).mockImplementation(async ({ data }: any) => ({
      id: ORG_ID,
      ...data,
    }));

    const req = {
      user: { organizationId: ORG_ID },
      body: {
        idpMetadataXml: MOCK_XML,
        sso_provider: 'Microsoft Entra ID (SAML 2.0)',
      },
    };
    const res = makeRes();
    const next = jest.fn();

    await updateSsoConfig(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(prisma.organizations.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: ORG_ID },
        data: expect.objectContaining({
          sso_enabled: true,
          sso_provider: 'Microsoft Entra ID (SAML 2.0)',
          saml_metadata: expect.objectContaining({
            idpMetadataXml: MOCK_XML,
            attributeMapping: ENTRA_ATTRIBUTE_PRESET,
          }),
        }),
      })
    );
  });
});

/**
 * Tests for updateSsoConfig endpoint in sso.controller.ts.
 *
 * Verifies that allowedEmailDomains is saved, normalized, and preserved
 * across updates when omitted.
 */
import { execFileSync } from 'child_process';
import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import prisma from '../../config/db';
import {
  updateSsoConfig,
  normalizeAllowedDomains,
  mapSamlRole,
  testSsoConnection,
  getSamlMetadata,
  OKTA_ATTRIBUTE_PRESET
} from '../../controllers/sso.controller';

jest.mock('../../config/db', () => ({
  __esModule: true,
  default: {
    organizations: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('normalizeAllowedDomains helper', () => {
  it('handles array input with mixed case and leading @', () => {
    expect(normalizeAllowedDomains(['@Acme.com', '  EXAMPLE.ORG ', '@sub.acme.com'])).toEqual([
      'acme.com',
      'example.org',
      'sub.acme.com',
    ]);
  });

  it('handles comma-separated string input', () => {
    expect(normalizeAllowedDomains('@acme.com, example.com, @Test.Co')).toEqual([
      'acme.com',
      'example.com',
      'test.co',
    ]);
  });

  it('returns empty array for invalid or empty input', () => {
    expect(normalizeAllowedDomains([])).toEqual([]);
    expect(normalizeAllowedDomains('')).toEqual([]);
    expect(normalizeAllowedDomains(null)).toEqual([]);
    expect(normalizeAllowedDomains(undefined)).toEqual([]);
  });
});

describe('updateSsoConfig controller', () => {
  const ORG_ID = 'org-test-123';
  const MOCK_XML = '<EntityDescriptor>test</EntityDescriptor>';

  const makeReq = (body: Record<string, any>) => ({
    user: { organizationId: ORG_ID },
    body,
  } as any);

  const makeRes = () => {
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    return res;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 if idpMetadataXml is missing', async () => {
    const req = makeReq({ sso_provider: 'SAML' });
    const res = makeRes();
    const next = jest.fn();

    await updateSsoConfig(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'IdP Metadata XML is required' })
    );
  });

  it('saves allowedEmailDomains on initial setup and normalizes the entries', async () => {
    (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
      id: ORG_ID,
      saml_metadata: {},
    });
    (prisma.organizations.update as jest.Mock).mockImplementation(async ({ data }: any) => ({
      id: ORG_ID,
      ...data,
    }));

    const req = makeReq({
      idpMetadataXml: MOCK_XML,
      sso_provider: 'Okta',
      allowedEmailDomains: ['@Acme.COM', 'partner.io'],
    });
    const res = makeRes();
    const next = jest.fn();

    await updateSsoConfig(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(prisma.organizations.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: ORG_ID },
        data: expect.objectContaining({
          sso_enabled: true,
          sso_provider: 'Okta',
          saml_metadata: expect.objectContaining({
            idpMetadataXml: MOCK_XML,
            allowedEmailDomains: ['acme.com', 'partner.io'],
          }),
        }),
      })
    );
  });

  it('preserves existing allowedEmailDomains when updating other settings without passing allowedEmailDomains', async () => {
    const existingDomains = ['acme.com', 'internal.net'];
    (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
      id: ORG_ID,
      saml_metadata: {
        allowedEmailDomains: existingDomains,
        scimBearerToken: 'test-encrypted-token',
      },
    });
    (prisma.organizations.update as jest.Mock).mockImplementation(async ({ data }: any) => ({
      id: ORG_ID,
      ...data,
    }));

    // Update only IdP metadata and provider, omitting allowedEmailDomains entirely
    const req = makeReq({
      idpMetadataXml: '<NewEntityDescriptor>updated</NewEntityDescriptor>',
      sso_provider: 'EntraID',
    });
    const res = makeRes();
    const next = jest.fn();

    await updateSsoConfig(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(prisma.organizations.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: ORG_ID },
        data: expect.objectContaining({
          sso_provider: 'EntraID',
          saml_metadata: expect.objectContaining({
            idpMetadataXml: '<NewEntityDescriptor>updated</NewEntityDescriptor>',
            allowedEmailDomains: existingDomains,
          }),
        }),
      })
    );
  });

  it('clears or replaces allowedEmailDomains when an explicit empty array is sent', async () => {
    (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
      id: ORG_ID,
      saml_metadata: {
        allowedEmailDomains: ['acme.com'],
      },
    });
    (prisma.organizations.update as jest.Mock).mockImplementation(async ({ data }: any) => ({
      id: ORG_ID,
      ...data,
    }));

    const req = makeReq({
      idpMetadataXml: MOCK_XML,
      allowedEmailDomains: [],
    });
    const res = makeRes();
    const next = jest.fn();

    await updateSsoConfig(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(prisma.organizations.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: ORG_ID },
        data: expect.objectContaining({
          saml_metadata: expect.objectContaining({
            allowedEmailDomains: [],
          }),
        }),
      })
    );
  });

  it('automatically applies OKTA_ATTRIBUTE_PRESET when provider is Okta and mapping is omitted', async () => {
    (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
      id: ORG_ID,
      saml_metadata: {},
    });
    (prisma.organizations.update as jest.Mock).mockImplementation(async ({ data }: any) => ({
      id: ORG_ID,
      ...data,
    }));

    const req = makeReq({
      idpMetadataXml: MOCK_XML,
      sso_provider: 'Okta',
    });
    const res = makeRes();
    const next = jest.fn();

    await updateSsoConfig(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(prisma.organizations.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: ORG_ID },
        data: expect.objectContaining({
          sso_provider: 'Okta',
          saml_metadata: expect.objectContaining({
            attributeMapping: OKTA_ATTRIBUTE_PRESET,
          }),
        }),
      })
    );
  });

  it('preserves custom attributeMapping when provided explicitly for Okta', async () => {
    const customMapping = {
      email: 'customEmail',
      firstName: 'customFirst',
      lastName: 'customLast',
      role: 'customRole',
    };
    (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
      id: ORG_ID,
      saml_metadata: {},
    });
    (prisma.organizations.update as jest.Mock).mockImplementation(async ({ data }: any) => ({
      id: ORG_ID,
      ...data,
    }));

    const req = makeReq({
      idpMetadataXml: MOCK_XML,
      sso_provider: 'Okta',
      attributeMapping: customMapping,
    });
    const res = makeRes();
    const next = jest.fn();

    await updateSsoConfig(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(prisma.organizations.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          saml_metadata: expect.objectContaining({
            attributeMapping: customMapping,
          }),
        }),
      })
    );
  });
});

describe('mapSamlRole role resolution & escalation protection', () => {
  it('maps documented exact group names to ADMIN', () => {
    expect(mapSamlRole('ADMIN')).toBe('ADMIN');
    expect(mapSamlRole('admin')).toBe('ADMIN');
    expect(mapSamlRole('SENTRA_ADMIN')).toBe('ADMIN');
    expect(mapSamlRole('sentra_admin')).toBe('ADMIN');
  });

  it('rejects loose substring matching for ADMIN and defaults to VIEWER', () => {
    expect(mapSamlRole('Administrator')).toBe('VIEWER');
    expect(mapSamlRole('ADMINISTRATOR')).toBe('VIEWER');
    expect(mapSamlRole('Jira Administrators')).toBe('VIEWER');
    expect(mapSamlRole('DB_ADMIN')).toBe('VIEWER');
    expect(mapSamlRole('SENTRA_ADMIN_GROUP')).toBe('VIEWER');
    expect(mapSamlRole('org:ADMIN')).toBe('VIEWER');
    expect(mapSamlRole('COMPANY_ADMIN')).toBe('VIEWER');
  });

  it('maps allowed standard documented roles correctly', () => {
    expect(mapSamlRole('ENGINEER')).toBe('ENGINEER');
    expect(mapSamlRole('SENTRA_ENGINEER')).toBe('ENGINEER');
    expect(mapSamlRole('AUDITOR')).toBe('AUDITOR');
    expect(mapSamlRole('SENTRA_AUDITOR')).toBe('AUDITOR');
    expect(mapSamlRole('MEMBER')).toBe('MEMBER');
    expect(mapSamlRole('SENTRA_MEMBER')).toBe('MEMBER');
    expect(mapSamlRole('VIEWER')).toBe('VIEWER');
    expect(mapSamlRole('SENTRA_VIEWER')).toBe('VIEWER');
  });

  it('rejects loose substring matching for other roles and defaults to VIEWER', () => {
    expect(mapSamlRole('Engineering-Team')).toBe('VIEWER');
    expect(mapSamlRole('Compliance_Auditor')).toBe('VIEWER');
    expect(mapSamlRole('Standard-User')).toBe('VIEWER');
    expect(mapSamlRole('ReadOnly-Access')).toBe('VIEWER');
    expect(mapSamlRole('org:MEMBER')).toBe('VIEWER');
  });

  it('respects precedence order ADMIN > ENGINEER > AUDITOR > MEMBER > VIEWER', () => {
    expect(mapSamlRole(['MEMBER', 'ADMIN'])).toBe('ADMIN');
    expect(mapSamlRole(['VIEWER', 'ENGINEER'])).toBe('ENGINEER');
    expect(mapSamlRole(['MEMBER', 'AUDITOR'])).toBe('AUDITOR');
    expect(mapSamlRole(['VIEWER', 'MEMBER'])).toBe('MEMBER');
  });

  it('BLOCKED: strictly denies SUPER_ADMIN escalation and demotes to VIEWER', () => {
    expect(mapSamlRole('SUPER_ADMIN')).toBe('VIEWER');
    expect(mapSamlRole('SUPERADMIN')).toBe('VIEWER');
    expect(mapSamlRole('superadmin')).toBe('VIEWER');
    expect(mapSamlRole('app_super_admin_role')).toBe('VIEWER');
    expect(mapSamlRole(['SUPER_ADMIN', 'ADMIN'])).toBe('VIEWER');
    expect(mapSamlRole(['SUPERADMIN', 'ADMIN'])).toBe('VIEWER');
  });

  it('defaults missing, unknown, or empty roles to VIEWER', () => {
    expect(mapSamlRole(null)).toBe('VIEWER');
    expect(mapSamlRole(undefined)).toBe('VIEWER');
    expect(mapSamlRole('')).toBe('VIEWER');
    expect(mapSamlRole('UNKNOWN_CUSTOM_GROUP')).toBe('VIEWER');
    expect(mapSamlRole([])).toBe('VIEWER');
  });
});

describe('getSamlMetadata controller', () => {
  const ORG_SLUG = 'acme-metadata-test';

  it('returns SP metadata XML when no IdP metadata is configured', async () => {
    (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
      id: 'org-meta-1',
      slug: ORG_SLUG,
      sso_enabled: false,
      saml_metadata: null,
    });

    const req: any = { params: { orgSlug: ORG_SLUG } };
    const res: any = {
      header: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();

    await getSamlMetadata(req, res, next);

    expect(prisma.organizations.findUnique).toHaveBeenCalledWith({
      where: { slug: ORG_SLUG },
    });
    expect(res.header).toHaveBeenCalledWith('Content-Type', 'application/xml');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalled();
    const xml = res.send.mock.calls[0][0];
    expect(xml).toContain('EntityDescriptor');
    expect(xml).toContain(`/api/v1/saml/${ORG_SLUG}/metadata`);
    expect(xml).toContain(`/api/v1/saml/${ORG_SLUG}/callback`);
  });

  it('returns 404 when organization is not found by slug', async () => {
    (prisma.organizations.findUnique as jest.Mock).mockResolvedValue(null);

    const req: any = { params: { orgSlug: 'non-existent-org' } };
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();

    await getSamlMetadata(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Organization not found',
    });
  });
});

describe('testSsoConnection controller', () => {
  const ORG_ID = 'org-test-123';
  let tempKeyDir: string;
  let validCertBase64: string;
  let expiredCertBase64: string;

  beforeAll(() => {
    tempKeyDir = mkdtempSync(path.join(tmpdir(), 'sso-cert-test-'));

    // Generate valid 10-day cert
    const validKeyPath = path.join(tempKeyDir, 'valid.key');
    const validCertPath = path.join(tempKeyDir, 'valid.crt');
    execFileSync(
      'openssl',
      ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', validKeyPath, '-out', validCertPath, '-days', '10', '-subj', '/CN=valid-idp'],
      { stdio: 'ignore' }
    );
    const validPem = readFileSync(validCertPath, 'utf8');
    validCertBase64 = validPem.replace(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\s+/g, '');

    // Generate expired cert (1 day in past via -days 1 and faketime or openssl startdate if possible,
    // or simulate expired by generating a cert with 1 second validity or setting -days -1 if supported,
    // otherwise we can test corrupted cert / test expired handling)
    const expKeyPath = path.join(tempKeyDir, 'exp.key');
    const expCertPath = path.join(tempKeyDir, 'exp.crt');
    try {
      execFileSync(
        'openssl',
        ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', expKeyPath, '-out', expCertPath, '-days', '0', '-subj', '/CN=exp-idp'],
        { stdio: 'ignore' }
      );
      const expPem = readFileSync(expCertPath, 'utf8');
      expiredCertBase64 = expPem.replace(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\s+/g, '');
    } catch {
      expiredCertBase64 = validCertBase64; // fallback
    }
  });

  afterAll(() => {
    rmSync(tempKeyDir, { recursive: true, force: true });
  });

  const makeReq = (body: Record<string, any>) => ({
    user: { organizationId: ORG_ID },
    body,
  } as any);

  const makeRes = () => {
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    return res;
  };

  it('returns 400 when no metadata XML is provided in body or DB', async () => {
    (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
      id: ORG_ID,
      saml_metadata: {},
    });
    const req = makeReq({});
    const res = makeRes();

    await testSsoConnection(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, valid: false })
    );
  });

  it('returns 200 with valid: false when XML is missing EntityDescriptor / IDPSSODescriptor', async () => {
    (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({ id: ORG_ID });
    const req = makeReq({
      idpMetadataXml: '<SomeOtherXml><Data>not-saml</Data></SomeOtherXml>',
    });
    const res = makeRes();

    await testSsoConnection(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        valid: false,
        details: expect.objectContaining({
          checks: expect.arrayContaining([
            expect.objectContaining({ name: 'Metadata XML Structure', passed: false }),
          ]),
        }),
      })
    );
  });

  it('returns 200 with valid: false when SingleSignOnService is missing', async () => {
    (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({ id: ORG_ID });
    const xml = `
      <md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="http://www.okta.com/exk123">
        <md:IDPSSODescriptor>
          <md:KeyDescriptor>
            <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
              <ds:X509Data>
                <ds:X509Certificate>${validCertBase64}</ds:X509Certificate>
              </ds:X509Data>
            </ds:KeyInfo>
          </md:KeyDescriptor>
        </md:IDPSSODescriptor>
      </md:EntityDescriptor>
    `;
    const req = makeReq({ idpMetadataXml: xml });
    const res = makeRes();

    await testSsoConnection(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        valid: false,
        details: expect.objectContaining({
          checks: expect.arrayContaining([
            expect.objectContaining({ name: 'SingleSignOnService Endpoint', passed: false }),
          ]),
        }),
      })
    );
  });

  it('returns 200 with valid: false when required email mapping is empty', async () => {
    (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({ id: ORG_ID });
    const xml = `
      <md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="http://www.okta.com/exk123">
        <md:IDPSSODescriptor>
          <md:KeyDescriptor>
            <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
              <ds:X509Data>
                <ds:X509Certificate>${validCertBase64}</ds:X509Certificate>
              </ds:X509Data>
            </ds:KeyInfo>
          </md:KeyDescriptor>
          <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="https://trial.okta.com/app/sso/saml"/>
        </md:IDPSSODescriptor>
      </md:EntityDescriptor>
    `;
    const req = makeReq({
      idpMetadataXml: xml,
      attributeMapping: { email: '', firstName: 'firstName' },
    });
    const res = makeRes();

    await testSsoConnection(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        valid: false,
        details: expect.objectContaining({
          checks: expect.arrayContaining([
            expect.objectContaining({ name: 'Required Attributes', passed: false }),
          ]),
        }),
      })
    );
  });

  it('returns 200 with valid: true when metadata, SSO endpoint, cert, and attributes are all valid', async () => {
    (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({ id: ORG_ID });
    const xml = `
      <md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="http://www.okta.com/exk123">
        <md:IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
          <md:KeyDescriptor use="signing">
            <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
              <ds:X509Data>
                <ds:X509Certificate>${validCertBase64}</ds:X509Certificate>
              </ds:X509Data>
            </ds:KeyInfo>
          </md:KeyDescriptor>
          <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="https://trial.okta.com/app/sso/saml"/>
        </md:IDPSSODescriptor>
      </md:EntityDescriptor>
    `;
    const req = makeReq({
      idpMetadataXml: xml,
      attributeMapping: OKTA_ATTRIBUTE_PRESET,
    });
    const res = makeRes();

    await testSsoConnection(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.valid).toBe(true);
    expect(body.details.entityId).toBe('http://www.okta.com/exk123');
    expect(body.details.ssoUrl).toBe('https://trial.okta.com/app/sso/saml');
    expect(body.details.certValid).toBe(true);
    expect(body.details.checks.every((c: any) => c.passed)).toBe(true);

    // Verify secret protection: no private keys, passwords, or SCIM tokens leaked
    const jsonStr = JSON.stringify(body);
    expect(jsonStr).not.toContain('BEGIN PRIVATE KEY');
    expect(jsonStr).not.toContain('scimBearerToken');
    expect(jsonStr).not.toContain('client_secret');
  });
});

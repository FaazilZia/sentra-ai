/**
 * Tests for updateSsoConfig endpoint in sso.controller.ts.
 *
 * Verifies that allowedEmailDomains is saved, normalized, and preserved
 * across updates when omitted.
 */
import prisma from '../../config/db';
import { updateSsoConfig, normalizeAllowedDomains } from '../../controllers/sso.controller';

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
});

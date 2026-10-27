/**
 * SAML callback security tests (real samlify signing, mocked database).
 *
 * Covers: cross-org rejection, allowed email domain, audit logging, and
 * rejection of unsigned / wrongly signed / tampered SAML responses.
 * Test keys are generated at run time, so no private key is stored in the repo.
 */
import { execFileSync } from 'child_process';
import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import * as samlify from 'samlify';

jest.mock('../../config/db', () => ({
  __esModule: true,
  default: {
    organizations: { findUnique: jest.fn() },
    users: { findFirst: jest.fn(), create: jest.fn() },
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
import { samlCallback } from '../../controllers/sso.controller';

samlify.setSchemaValidator({ validate: () => Promise.resolve('skipped') });

const ORG_SLUG = 'acme';
const ORG_ID = 'org-acme';
const OTHER_ORG_ID = 'org-other';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:10000';
const SP_ENTITY_ID = `${BACKEND_URL}/api/v1/saml/${ORG_SLUG}/metadata`;
const SP_ACS_URL = `${BACKEND_URL}/api/v1/saml/${ORG_SLUG}/callback`;
const POST_BINDING = samlify.Constants.namespace.binding.post;

const LOGIN_RESPONSE_TEMPLATE =
  '<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="{ID}" Version="2.0" IssueInstant="{IssueInstant}" Destination="{Destination}" InResponseTo="{InResponseTo}">' +
  '<saml:Issuer>{Issuer}</saml:Issuer>' +
  '<samlp:Status><samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/></samlp:Status>' +
  '<saml:Assertion xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xs="http://www.w3.org/2001/XMLSchema" ID="{AssertionID}" Version="2.0" IssueInstant="{IssueInstant}">' +
  '<saml:Issuer>{Issuer}</saml:Issuer>' +
  '<saml:Subject><saml:NameID Format="{NameIDFormat}">{NameID}</saml:NameID>' +
  '<saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">' +
  '<saml:SubjectConfirmationData NotOnOrAfter="{SubjectConfirmationDataNotOnOrAfter}" Recipient="{SubjectRecipient}" InResponseTo="{InResponseTo}"/>' +
  '</saml:SubjectConfirmation></saml:Subject>' +
  '<saml:Conditions NotBefore="{ConditionsNotBefore}" NotOnOrAfter="{ConditionsNotOnOrAfter}"><saml:AudienceRestriction><saml:Audience>{Audience}</saml:Audience></saml:AudienceRestriction></saml:Conditions>' +
  '<saml:AuthnStatement AuthnInstant="{IssueInstant}" SessionIndex="{SessionIndex}"><saml:AuthnContext><saml:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport</saml:AuthnContextClassRef></saml:AuthnContext></saml:AuthnStatement>' +
  '</saml:Assertion></samlp:Response>';

let keyDir: string;

const makeKeyPair = (name: string) => {
  const keyPath = path.join(keyDir, `${name}.key`);
  const certPath = path.join(keyDir, `${name}.crt`);
  execFileSync(
    'openssl',
    ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', keyPath, '-out', certPath, '-days', '2', '-subj', `/CN=${name}`],
    { stdio: 'ignore' }
  );
  return { privateKey: readFileSync(keyPath, 'utf8'), cert: readFileSync(certPath, 'utf8') };
};

const makeIdp = (keys: { privateKey: string; cert: string }) =>
  samlify.IdentityProvider({
    entityID: 'https://idp.test/metadata',
    signingCert: keys.cert,
    privateKey: keys.privateKey,
    singleSignOnService: [{ Binding: POST_BINDING, Location: 'https://idp.test/sso' }],
    singleLogoutService: [{ Binding: POST_BINDING, Location: 'https://idp.test/slo' }],
    nameIDFormat: ['urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'],
    loginResponseTemplate: { context: LOGIN_RESPONSE_TEMPLATE },
  });

const sp = samlify.ServiceProvider({
  entityID: SP_ENTITY_ID,
  assertionConsumerService: [{ Binding: POST_BINDING, Location: SP_ACS_URL }],
});

let trustedIdp: ReturnType<typeof makeIdp>;
let attackerIdp: ReturnType<typeof makeIdp>;

const signedResponse = async (idp: ReturnType<typeof makeIdp>, email: string): Promise<string> => {
  const { context } = await idp.createLoginResponse(
    sp,
    { extract: { request: { id: '_request-1' } } } as any,
    'post',
    { email }
  );
  return context;
};

const decode = (b64: string) => Buffer.from(b64, 'base64').toString('utf8');
const encode = (xml: string) => Buffer.from(xml, 'utf8').toString('base64');

const makeReq = (samlResponse: string) =>
  ({ params: { orgSlug: ORG_SLUG }, body: { SAMLResponse: samlResponse } }) as any;

const makeRes = () => ({ redirect: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() }) as any;

const mockOrg = (extraMetadata: Record<string, any> = {}) => {
  (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
    id: ORG_ID,
    slug: ORG_SLUG,
    sso_enabled: true,
    sso_provider: 'SAML',
    saml_metadata: { idpMetadataXml: trustedIdp.getMetadata(), ...extraMetadata },
  });
};

const LOGIN_ERROR = expect.stringContaining('/login?error=sso_failed');

beforeAll(() => {
  keyDir = mkdtempSync(path.join(tmpdir(), 'saml-test-'));
  trustedIdp = makeIdp(makeKeyPair('trusted'));
  attackerIdp = makeIdp(makeKeyPair('attacker'));
});

afterAll(() => {
  rmSync(keyDir, { recursive: true, force: true });
});

beforeEach(() => {
  (prisma.users.findFirst as jest.Mock).mockResolvedValue(null);
  (prisma.users.create as jest.Mock).mockImplementation(async ({ data }: any) => ({ ...data }));
});

describe('samlCallback: valid logins', () => {
  it('creates a new user in the correct org and logs them in', async () => {
    mockOrg();
    const res = makeRes();

    await samlCallback(makeReq(await signedResponse(trustedIdp, 'new.user@acme.com')), res, jest.fn());

    expect(prisma.users.create).toHaveBeenCalledTimes(1);
    expect((prisma.users.create as jest.Mock).mock.calls[0][0].data).toMatchObject({
      email: 'new.user@acme.com',
      organizationId: ORG_ID,
    });
    expect(setAuthCookiesAndTokens).toHaveBeenCalledWith(res, expect.objectContaining({ organizationId: ORG_ID }));
    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SAML_SSO_LOGIN_SUCCESS', organizationId: ORG_ID })
    );
    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('/dashboard'));
  });

  it('logs in an existing user who already belongs to this org, without creating a new one', async () => {
    mockOrg();
    (prisma.users.findFirst as jest.Mock).mockResolvedValue({
      id: 'user-1', email: 'jane@acme.com', role: 'MEMBER', organizationId: ORG_ID,
    });
    const res = makeRes();

    await samlCallback(makeReq(await signedResponse(trustedIdp, 'jane@acme.com')), res, jest.fn());

    expect(prisma.users.create).not.toHaveBeenCalled();
    expect(setAuthCookiesAndTokens).toHaveBeenCalledWith(res, expect.objectContaining({ id: 'user-1', organizationId: ORG_ID }));
    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('/dashboard'));
  });
});

describe('samlCallback: cross-org protection', () => {
  it('rejects an email that already belongs to a different org and writes an audit entry', async () => {
    mockOrg();
    (prisma.users.findFirst as jest.Mock).mockResolvedValue({
      id: 'victim-1', email: 'ceo@other.com', role: 'ADMIN', organizationId: OTHER_ORG_ID,
    });
    const res = makeRes();

    await samlCallback(makeReq(await signedResponse(trustedIdp, 'ceo@other.com')), res, jest.fn());

    expect(setAuthCookiesAndTokens).not.toHaveBeenCalled();
    expect(prisma.users.create).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith(LOGIN_ERROR);
    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SAML_SSO_LOGIN_REJECTED',
        userId: 'victim-1',
        organizationId: ORG_ID,
        outcome: 'failure',
        metadata: expect.objectContaining({
          reason: 'ORGANIZATION_MISMATCH',
          attemptedOrganizationId: ORG_ID,
          userOrganizationId: OTHER_ORG_ID,
        }),
      })
    );
    expect(auditLogger.log).not.toHaveBeenCalledWith(expect.objectContaining({ action: 'SAML_SSO_LOGIN_SUCCESS' }));
  });
});

describe('samlCallback: allowed email domain', () => {
  it('rejects an email outside the allowed domains', async () => {
    mockOrg({ allowedEmailDomains: ['acme.com'] });
    const res = makeRes();

    await samlCallback(makeReq(await signedResponse(trustedIdp, 'intruder@evil.com')), res, jest.fn());

    expect(prisma.users.create).not.toHaveBeenCalled();
    expect(setAuthCookiesAndTokens).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith(LOGIN_ERROR);
  });

  it('writes an audit entry when a known user is rejected for domain', async () => {
    mockOrg({ allowedEmailDomains: ['acme.com'] });
    (prisma.users.findFirst as jest.Mock).mockResolvedValue({
      id: 'user-9', email: 'bob@evil.com', role: 'MEMBER', organizationId: ORG_ID,
    });

    await samlCallback(makeReq(await signedResponse(trustedIdp, 'bob@evil.com')), makeRes(), jest.fn());

    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SAML_SSO_LOGIN_REJECTED',
        metadata: expect.objectContaining({ reason: 'EMAIL_DOMAIN_NOT_ALLOWED' }),
      })
    );
  });

  it('accepts an allowed domain regardless of letter case or a leading @ in the config', async () => {
    mockOrg({ allowedEmailDomains: ['@ACME.com'] });
    const res = makeRes();

    await samlCallback(makeReq(await signedResponse(trustedIdp, 'Sam@Acme.com')), res, jest.fn());

    expect(prisma.users.create).toHaveBeenCalledTimes(1);
    expect((prisma.users.create as jest.Mock).mock.calls[0][0].data.email).toBe('sam@acme.com');
    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('/dashboard'));
  });
});

describe('samlCallback: signature validation', () => {
  const expectNoLogin = (res: any) => {
    expect(prisma.users.create).not.toHaveBeenCalled();
    expect(setAuthCookiesAndTokens).not.toHaveBeenCalled();
    expect(auditLogger.log).not.toHaveBeenCalledWith(expect.objectContaining({ action: 'SAML_SSO_LOGIN_SUCCESS' }));
    expect(res.redirect).toHaveBeenCalledWith(LOGIN_ERROR);
  };

  it('rejects an unsigned response', async () => {
    mockOrg();
    const xml = decode(await signedResponse(trustedIdp, 'jane@acme.com'));
    const unsigned = xml.replace(/<(\w+:)?Signature[\s\S]*?<\/(\w+:)?Signature>/g, '');
    expect(unsigned).not.toEqual(xml); // make sure the signature really was removed
    const res = makeRes();

    await samlCallback(makeReq(encode(unsigned)), res, jest.fn());

    expectNoLogin(res);
  });

  it('rejects a response signed with a key the org does not trust', async () => {
    mockOrg();
    const res = makeRes();

    await samlCallback(makeReq(await signedResponse(attackerIdp, 'jane@acme.com')), res, jest.fn());

    expectNoLogin(res);
  });

  it('rejects a response that was changed after it was signed', async () => {
    mockOrg();
    const xml = decode(await signedResponse(trustedIdp, 'jane@acme.com'));
    const tampered = xml.split('jane@acme.com').join('ceo@acme.com');
    expect(tampered).not.toEqual(xml);
    const res = makeRes();

    await samlCallback(makeReq(encode(tampered)), res, jest.fn());

    expectNoLogin(res);
  });
});

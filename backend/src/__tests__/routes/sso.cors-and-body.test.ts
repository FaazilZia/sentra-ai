/**
 * Real middleware stack integration tests for SAML ACS callback CORS exemption and body parsing.
 *
 * Verifies:
 * 1. POST /api/v1/saml/:orgSlug/callback with foreign Origin (e.g. https://trial-1398524.okta.com)
 *    and application/x-www-form-urlencoded body is NOT rejected by CORS and reaches the controller.
 * 2. SAMLResponse and RelayState are properly parsed in req.body by the scoped urlencoded parser.
 * 3. Non-SAML routes (e.g. /api/v1/auth/login) with the same foreign Origin are STILL rejected by CORS.
 * 4. Non-SAML routes do NOT accept or parse application/x-www-form-urlencoded bodies.
 */

import request from 'supertest';
import app from '../../app';
import prisma from '../../config/db';
import * as ssoController from '../../controllers/sso.controller';

jest.mock('../../config/db', () => ({
  __esModule: true,
  default: {
    organizations: {
      findUnique: jest.fn(),
    },
    users: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../../utils/auditLogger', () => ({
  auditLogger: {
    log: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('SAML ACS Callback CORS & Body Parsing Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exempts ONLY the SAML callback route from CORS origin rejection and echoes the origin header', async () => {
    (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
      id: 'org-test-sso',
      slug: 'okta-test-sso',
      sso_enabled: true,
      saml_metadata: null, // triggers controller 400, proving CORS passed and controller handled request
    });

    const res = await request(app)
      .post('/api/v1/saml/okta-test-sso/callback')
      .set('Origin', 'https://trial-1398524.okta.com')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send('SAMLResponse=mockSignedSamlAssertionBase64&RelayState=https%3A%2F%2Fsentra.ai%2Fdashboard');

    // Must NOT be rejected by CORS with 500 "Not allowed by CORS"
    expect(res.status).not.toBe(500);
    expect(res.headers['access-control-allow-origin']).toBe('https://trial-1398524.okta.com');
    expect(res.headers['access-control-allow-credentials']).toBe('true');

    // Reached controller logic
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'IdP Metadata XML is not configured for this organization',
    });
  });

  it('parses application/x-www-form-urlencoded body so SAMLResponse and RelayState are present at the controller', async () => {
    (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
      id: 'org-test-sso',
      slug: 'okta-test-sso',
      sso_enabled: true,
      saml_metadata: null,
    });

    const samlSpy = jest.spyOn(ssoController, 'samlCallback');

    await request(app)
      .post('/api/v1/saml/okta-test-sso/callback')
      .set('Origin', 'https://trial-1398524.okta.com')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send('SAMLResponse=PHNhbWxwOlJlc3BvbnNlPjwvc2FtbHA6UmVzcG9uc2U%2B&RelayState=test-relay-state-value');

    expect(samlSpy).toHaveBeenCalled();
    const reqArg = samlSpy.mock.calls[samlSpy.mock.calls.length - 1][0];
    expect(reqArg.body).toBeDefined();
    expect(reqArg.body.SAMLResponse).toBe('PHNhbWxwOlJlc3BvbnNlPjwvc2FtbHA6UmVzcG9uc2U+');
    expect(reqArg.body.RelayState).toBe('test-relay-state-value');
  });

  it('strictly rejects non-SAML routes with the same foreign origin via CORS', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Origin', 'https://trial-1398524.okta.com')
      .set('Content-Type', 'application/json')
      .send({ email: 'user@okta.com', password: 'Password123!' });

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({
      success: false,
      message: 'Not allowed by CORS',
    });
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('does not parse form-urlencoded bodies on non-SAML routes', async () => {
    // Non-SAML routes only parse JSON. When sending urlencoded data, req.body is not populated.
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Origin', 'http://localhost:5173')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send('email=admin%40sentra.ai&password=Password123%21');

    // Express validator or auth controller rejects missing JSON payload with 400 Bad Request
    expect(res.status).toBe(400);
  });

  it('allows requests without an Origin header and requests from allowed localhost origins', async () => {
    // Request with no Origin header (e.g. curl or internal microservice)
    const resNoOrigin = await request(app)
      .get('/ping');
    expect(resNoOrigin.status).toBe(200);

    // Request with allowed origin
    const resAllowed = await request(app)
      .get('/ping')
      .set('Origin', 'http://localhost:5173');
    expect(resAllowed.status).toBe(200);
    expect(resAllowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });
});

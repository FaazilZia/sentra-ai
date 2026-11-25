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
import fs from 'node:fs';
import path from 'node:path';
import app from '../../app';
import { isDevLocalOrigin, isOriginAllowed, getAllowedOrigins, DEFAULT_ALLOWED_ORIGINS } from '../../utils/corsHelper';
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

  it('ensures localhost:5173 is removed from FRONTEND_URL in both render.yaml files', () => {
    const rootRenderYaml = fs.readFileSync(path.resolve(__dirname, '../../../../render.yaml'), 'utf8');
    const backendRenderYaml = fs.readFileSync(path.resolve(__dirname, '../../../render.yaml'), 'utf8');

    expect(rootRenderYaml).not.toContain('http://localhost:5173');
    expect(backendRenderYaml).not.toContain('http://localhost:5173');

    // Confirm production domains remain configured
    expect(rootRenderYaml).toContain('https://sentraatech.info');
    expect(backendRenderYaml).toContain('https://sentraatech.info');
  });

  it('strictly validates development localhost origins and rejects lookalikes/malformed origins (helper test)', () => {
    const originalEnv = process.env.NODE_ENV;

    try {
      // 1. Outside production (development/test):
      process.env.NODE_ENV = 'development';

      // Allowed outside production:
      expect(isDevLocalOrigin('http://localhost:5173')).toBe(true);
      expect(isDevLocalOrigin('https://localhost:5173')).toBe(true);
      expect(isDevLocalOrigin('http://127.0.0.1:5173')).toBe(true);
      expect(isDevLocalOrigin('https://127.0.0.1:3000')).toBe(true);

      // Rejected in development: lookalikes, paths, and malformed
      expect(isDevLocalOrigin('https://localhost.evil.com')).toBe(false);
      expect(isDevLocalOrigin('http://evil.com/localhost')).toBe(false);
      expect(isDevLocalOrigin('http://localhost.evil.com:5173')).toBe(false);
      expect(isDevLocalOrigin('malformed-origin')).toBe(false);
      expect(isDevLocalOrigin('://invalid')).toBe(false);
      expect(isDevLocalOrigin('')).toBe(false);
      expect(isDevLocalOrigin('ftp://localhost:21')).toBe(false);

      // 2. In production:
      process.env.NODE_ENV = 'production';

      // All localhost and lookalike origins are strictly rejected in production mode
      expect(isDevLocalOrigin('http://localhost:5173')).toBe(false);
      expect(isDevLocalOrigin('https://localhost:5173')).toBe(false);
      expect(isDevLocalOrigin('http://127.0.0.1:5173')).toBe(false);
      expect(isDevLocalOrigin('https://localhost.evil.com')).toBe(false);
      expect(isDevLocalOrigin('http://evil.com/localhost')).toBe(false);
      expect(isDevLocalOrigin('http://localhost.evil.com:5173')).toBe(false);
      expect(isDevLocalOrigin('malformed-origin')).toBe(false);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('verifies getAllowedOrigins and isOriginAllowed helper resolution', () => {
    const origFrontendUrl = process.env.FRONTEND_URL;
    const origCorsOrigins = process.env.CORS_ALLOWED_ORIGINS;
    const origNodeEnv = process.env.NODE_ENV;

    try {
      // Missing env -> falls back to DEFAULT_ALLOWED_ORIGINS
      delete process.env.FRONTEND_URL;
      delete process.env.CORS_ALLOWED_ORIGINS;
      expect(getAllowedOrigins()).toEqual(DEFAULT_ALLOWED_ORIGINS);

      // Configured via FRONTEND_URL
      process.env.FRONTEND_URL = 'https://custom1.sentraatech.info, https://custom2.sentraatech.info';
      expect(getAllowedOrigins()).toEqual(['https://custom1.sentraatech.info', 'https://custom2.sentraatech.info']);

      // Empty or undefined origin check
      expect(isOriginAllowed(undefined)).toBe(true);
      expect(isOriginAllowed('')).toBe(true);

      // Configured origin allowed
      expect(isOriginAllowed('https://custom1.sentraatech.info')).toBe(true);

      // Unconfigured foreign origin rejected
      process.env.NODE_ENV = 'production';
      expect(isOriginAllowed('https://untrusted.com')).toBe(false);
      expect(isOriginAllowed('http://localhost:5173')).toBe(false);
    } finally {
      if (origFrontendUrl === undefined) {
        delete process.env.FRONTEND_URL;
      } else {
        process.env.FRONTEND_URL = origFrontendUrl;
      }
      if (origCorsOrigins === undefined) {
        delete process.env.CORS_ALLOWED_ORIGINS;
      } else {
        process.env.CORS_ALLOWED_ORIGINS = origCorsOrigins;
      }
      if (origNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = origNodeEnv;
      }
    }
  });

  it('strictly rejects adversarial, lookalike, and untrusted Vercel origins via Express CORS HTTP middleware', async () => {
    const rejectedOrigins = [
      'https://evil.vercel.app',
      'https://sentra-ai.vercel.app.evil.com',
      'http://evil.vercel.app',
      'https://localhost.evil.com',
      'http://evil.com/localhost',
      'http://localhost.evil.com:5173',
      'http://attacker.com',
      'not-a-valid-url',
    ];

    for (const origin of rejectedOrigins) {
      // Test GET request
      const resGet = await request(app)
        .get('/ping')
        .set('Origin', origin);

      expect(resGet.status).toBe(500);
      expect(resGet.body).toMatchObject({
        success: false,
        message: 'Not allowed by CORS',
      });
      expect(resGet.headers['access-control-allow-origin']).toBeUndefined();

      // Test OPTIONS preflight request
      const resOptions = await request(app)
        .options('/ping')
        .set('Origin', origin)
        .set('Access-Control-Request-Method', 'GET');

      expect(resOptions.status).toBe(500);
      expect(resOptions.headers['access-control-allow-origin']).toBeUndefined();
    }
  });

  it('allows all 4 real production frontend domains via Express CORS HTTP middleware', async () => {
    const realProductionDomains = [
      'https://sentraatech.info',
      'https://www.sentraatech.info',
      'https://sentra-ai-tau.vercel.app',
      'https://sentra-ai.vercel.app',
    ];

    for (const origin of realProductionDomains) {
      // Test GET request
      const resGet = await request(app)
        .get('/ping')
        .set('Origin', origin);

      expect(resGet.status).toBe(200);
      expect(resGet.headers['access-control-allow-origin']).toBe(origin);
      expect(resGet.headers['access-control-allow-credentials']).toBe('true');

      // Test OPTIONS preflight request
      const resOptions = await request(app)
        .options('/ping')
        .set('Origin', origin)
        .set('Access-Control-Request-Method', 'GET');

      expect(resOptions.status).toBe(204);
      expect(resOptions.headers['access-control-allow-origin']).toBe(origin);
      expect(resOptions.headers['access-control-allow-credentials']).toBe('true');
    }
  });
});

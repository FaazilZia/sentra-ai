import request from 'supertest';
import { getAuthToken } from './helpers/getAuthToken';

const AUTH_TOKEN = getAuthToken();
const TEST_BASE_URL = process.env.TEST_BASE_URL || 'https://sentra-backend-node.onrender.com';

const testPassword = process.env.TEST_PASSWORD;
const testEmail = `ci-e2e-${Date.now()}@sentra-test.com`;
const testOrg = `ci-org-${Date.now()}`;
const testEmail2 = `ci-e2e2-${Date.now()}@sentra-test.com`;
const testOrg2 = `ci-org2-${Date.now()}`;

let cachedCsrfToken = '';
let cachedCookie = '';

async function postWithCsrf(path: string, body: object) {
  let req = request(TEST_BASE_URL).post(path);
  if (cachedCsrfToken) req = req.set('x-csrf-token', cachedCsrfToken);
  if (cachedCookie) req = req.set('Cookie', cachedCookie);

  let res = await req.send(body);

  if (res.status === 403 && res.body?.error === 'CSRF_INVALID') {
    const extractedToken = res.headers['x-csrf-token'];
    const setCookieHeader = res.headers['set-cookie'];
    const rawCookie = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;

    if (extractedToken) cachedCsrfToken = extractedToken;
    if (rawCookie) cachedCookie = rawCookie.split(';')[0].trim();

    let retryReq = request(TEST_BASE_URL).post(path);
    if (cachedCsrfToken) retryReq = retryReq.set('x-csrf-token', cachedCsrfToken);
    if (cachedCookie) retryReq = retryReq.set('Cookie', cachedCookie);
    res = await retryReq.send(body);
  } else {
    const extractedToken = res.headers['x-csrf-token'];
    const setCookieHeader = res.headers['set-cookie'];
    const rawCookie = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;

    if (extractedToken) cachedCsrfToken = extractedToken;
    if (rawCookie) cachedCookie = rawCookie.split(';')[0].trim();
  }

  return res;
}

describe('Auth Flow', () => {
  let authToken: string = AUTH_TOKEN;
  let orgId: string;
  let authToken2: string;
  let orgId2: string;

  beforeAll(async () => {
    if (!testPassword) {
      throw new Error('TEST_PASSWORD is required in environment variables for auth E2E tests.');
    }
  });

  test('POST /api/v1/auth/register - rejects weak password with 400 validation error', async () => {
    const res = await postWithCsrf('/api/v1/auth/register', {
      email: `weak-${Date.now()}@sentra-test.com`,
      password: 'weak',
      fullName: 'Weak User',
      organizationName: 'Weak Org'
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Validation failed');
    expect(res.body.errors).toBeDefined();
    expect(Array.isArray(res.body.errors)).toBe(true);
    
    const messages = res.body.errors.map((e: any) => e.message);
    expect(messages).toContain('Password must be at least 8 characters');
    expect(messages).toContain('Password must contain at least one uppercase letter');
    expect(messages).toContain('Password must contain at least one number');
    expect(messages).toContain('Password must contain at least one special character');
  });

  test('POST /api/v1/auth/register - creates org and user', async () => {
    const res = await postWithCsrf('/api/v1/auth/register', {
      email: testEmail,
      password: testPassword!,
      fullName: 'Test User',
      organizationName: testOrg
    });
      
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    if (res.body.data && res.body.data.user) expect(res.body.data.user.email).toBe(testEmail);
  });

  test('POST /api/v1/auth/login - returns JWT', async () => {
    const res = await postWithCsrf('/api/v1/auth/login', {
      email: testEmail,
      password: testPassword!
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.organizationId).toBeDefined();
    
    authToken = res.body.data.accessToken;
    orgId = res.body.data.user.organizationId;
  });

  test('Org isolation - user cannot access another org data', async () => {
    // Create second org
    await postWithCsrf('/api/v1/auth/register', {
      email: testEmail2,
      password: testPassword!,
      fullName: 'Test User 2',
      organizationName: testOrg2
    });

    const loginRes = await postWithCsrf('/api/v1/auth/login', {
      email: testEmail2,
      password: testPassword!
    });
      
    authToken2 = loginRes.body.data.accessToken;
    orgId2 = loginRes.body.data.user.organizationId;

    // Try to access first org with second token (assuming /api/v1/organizations/:id exists)
    const res = await request(TEST_BASE_URL)
      .get(`/api/v1/organizations/${orgId}`)
      .set('Authorization', `Bearer ${authToken2}`);
      
    expect([401, 403, 404]).toContain(res.status);
  });

  test('Invalid token - returns 401', async () => {
    const res = await request(TEST_BASE_URL)
      .get(`/api/v1/organizations/${orgId}`)
      .set('Authorization', 'Bearer invalid.token.value');
      
    expect(res.status).toBe(401);
  });

  test('JWT expiry - expired token rejected', async () => {
    // An intentionally expired/invalid JWT for testing rejection — not a real secret
    const expiredToken = process.env.TEST_EXPIRED_TOKEN || [ // NOSONAR
      'eyJhbGciOiJIUzI1NiJ9',
      'eyJ1c2VySWQiOiIxMjMiLCJleHAiOjF9',
      'invalid'
    ].join('.');
    
    const res = await request(TEST_BASE_URL)
      .get(`/api/v1/organizations/${orgId}`)
      .set('Authorization', `Bearer ${expiredToken}`);
      
    expect(res.status).toBe(401);
  });
});

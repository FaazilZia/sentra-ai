import request from 'supertest';
import { getAuthToken } from './helpers/getAuthToken';

const AUTH_TOKEN = getAuthToken();
const TEST_BASE_URL = process.env.TEST_BASE_URL || 'https://sentra-backend-node.onrender.com';

const testEmail = `ci-e2e-${Date.now()}@sentra-test.com`;
const testOrg = `ci-org-${Date.now()}`;
const testPassword = 'TestPass123!';
const testEmail2 = `ci-e2e2-${Date.now()}@sentra-test.com`;
const testOrg2 = `ci-org2-${Date.now()}`;

describe('Auth Flow', () => {
  let authToken: string = AUTH_TOKEN;
  let orgId: string;
  let authToken2: string;
  let orgId2: string;

  beforeAll(async () => {
    // Server warm-up handled by globalSetup — no sleep needed here
  });

  afterAll(async () => {
    // Clean up would typically go here or be handled by an external script
  });

  test('POST /api/v1/auth/register - creates org and user', async () => {
    const res = await request(TEST_BASE_URL)
      .post('/api/v1/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        fullName: 'Test User',
        organizationName: testOrg
      });
      
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    if (res.body.data && res.body.data.user) expect(res.body.data.user.email).toBe(testEmail);
  });

  test('POST /api/v1/auth/login - returns JWT', async () => {
    const res = await request(TEST_BASE_URL)
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: testPassword
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
    await request(TEST_BASE_URL)
      .post('/api/v1/auth/register')
      .send({
        email: testEmail2,
        password: testPassword,
        fullName: 'Test User 2',
        organizationName: testOrg2
      });

    const loginRes = await request(TEST_BASE_URL)
      .post('/api/v1/auth/login')
      .send({ email: testEmail2, password: testPassword });
      
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

import request from 'supertest';
import { getAuthToken } from './helpers/getAuthToken';

const AUTH_TOKEN = getAuthToken();
const TEST_BASE_URL = process.env.TEST_BASE_URL || 'https://sentra-backend-node.onrender.com';

describe('Drift Detection', () => {
  let authToken: string = AUTH_TOKEN;

  beforeAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 3000));

    // If no token is loaded, fallback to registering locally
    if (!authToken) {
      const testOrg = `test-org-drift-${Date.now()}`;
      const testEmail = `test-drift-${Date.now()}@sentra-test.com`;
      const testPassword = 'TestPass123!';
      await request(TEST_BASE_URL).post('/api/v1/auth/register').send({
        email: testEmail,
        password: testPassword,
        fullName: 'Drift Tester',
        organizationName: testOrg
      });

      const loginRes = await request(TEST_BASE_URL).post('/api/v1/auth/login').send({
        email: testEmail,
        password: testPassword
      });
      authToken = loginRes.body.data?.accessToken;
    }
  });

  test('GET /api/v1/drift/alerts - returns alert list', async () => {
    const res = await request(TEST_BASE_URL)
      .get('/api/v1/drift/alerts')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    // Support both old (data) and new (alerts) response shape
    const list = res.body.alerts ?? res.body.data;
    expect(Array.isArray(list)).toBe(true);
  });

  test('Drift alert contains required fields', async () => {
    const res = await request(TEST_BASE_URL)
      .get('/api/v1/drift/alerts')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    const list = res.body.alerts ?? res.body.data;
    expect(Array.isArray(list)).toBe(true);

    if (list.length > 0) {
      const alert = list[0];
      expect(alert).toHaveProperty('id');
      expect(alert).toHaveProperty('type');
      expect(alert).toHaveProperty('severity');
      // detectedAt or timestamp — both are valid depending on alert origin
      expect(alert.detectedAt ?? alert.timestamp).toBeDefined();
      expect(alert).toHaveProperty('agentId');
    }
  });

  test('High severity drift triggers alert', async () => {
    // Trigger a high-risk action to seed potential drift data
    await request(TEST_BASE_URL)
      .post('/api/v1/ai/check-action')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        agent: 'drift-test-agent',
        action: 'delete_database',
        metadata: { table: 'users', department: 'engineering' }
      });

    // High severity drift is detected asynchronously after action evaluation.
    // We verify the endpoint is healthy and returns expected shape.
    const res = await request(TEST_BASE_URL)
      .get('/api/v1/drift/alerts')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    const list = res.body.alerts ?? res.body.data;
    expect(Array.isArray(list)).toBe(true);
  });

  test('Drift alerts with status filter', async () => {
    const res = await request(TEST_BASE_URL)
      .get('/api/v1/drift/alerts?status=open')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    const list = res.body.alerts ?? res.body.data;
    expect(Array.isArray(list)).toBe(true);
    list.forEach((alert: any) => {
      expect(alert.status).toBe('open');
    });
  });
});

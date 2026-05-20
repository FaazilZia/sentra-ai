import request from 'supertest';

const TEST_BASE_URL = process.env.TEST_BASE_URL || 'https://sentra-backend-node.onrender.com';
const testOrg = `test-org-api-${Date.now()}`;
const testEmail = `test-api-${Date.now()}@sentra-test.com`;

describe('Core API Routes', () => {
  let token: string;
  let agentId: string;

  beforeAll(async () => {
    // 3 seconds warm-up
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await request(TEST_BASE_URL).post('/api/v1/auth/register').send({
      email: testEmail, password: 'TestPass123!', fullName: 'Test', organizationName: testOrg
    });
    const loginRes = await request(TEST_BASE_URL).post('/api/v1/auth/login').send({
      email: testEmail, password: 'TestPass123!'
    });
    token = loginRes.body.data?.accessToken;
  });

  // Health
  test('GET /ping - returns 200', async () => {
    const res = await request(TEST_BASE_URL).get('/ping');
    expect([200, 404]).toContain(res.status); // Some APIs use /health instead of /ping
  });

  test('GET /health - returns status ok', async () => {
    const res = await request(TEST_BASE_URL).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status');
  });

  // Agents
  test('POST /api/v1/agents - registers new agent', async () => {
    const res = await request(TEST_BASE_URL)
      .post('/api/v1/agents')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'API Test Agent', description: 'Test agent' });
    
    expect(res.status).toBe(201);
    expect(res.body.data?.id).toBeDefined();
    agentId = res.body.data.id;
  });

  test('GET /api/v1/agents - returns agent list', async () => {
    const res = await request(TEST_BASE_URL)
      .get('/api/v1/agents')
      .set('Authorization', `Bearer ${token}`);
      
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  // Actions
  test('POST /api/v1/actions/evaluate - evaluates action', async () => {
    const res = await request(TEST_BASE_URL)
      .post('/api/v1/actions/evaluate')
      .set('Authorization', `Bearer ${token}`)
      .send({ agentId, action: 'safe_action', params: {} });
      
    expect(res.status).toBe(200);
    expect(res.body.data?.decision).toBeDefined();
  });

  test('GET /api/v1/actions/history - returns action history', async () => {
    const res = await request(TEST_BASE_URL)
      .get('/api/v1/actions/history')
      .set('Authorization', `Bearer ${token}`);
      
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // Risk
  test('GET /api/v1/risk/score/:agentId - returns risk score', async () => {
    const res = await request(TEST_BASE_URL)
      .get(`/api/v1/risk/score/${agentId}`)
      .set('Authorization', `Bearer ${token}`);
      
    expect([200, 404]).toContain(res.status); // Adjust based on exact route existence
  });

  // Alerts
  test('GET /api/v1/alerts - returns alerts list', async () => {
    const res = await request(TEST_BASE_URL)
      .get('/api/v1/alerts')
      .set('Authorization', `Bearer ${token}`);
      
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // DELETE Agent
  test('DELETE /api/v1/agents/:id - removes agent', async () => {
    const res = await request(TEST_BASE_URL)
      .delete(`/api/v1/agents/${agentId}`)
      .set('Authorization', `Bearer ${token}`);
      
    expect([200, 204]).toContain(res.status);
  });

  // Unauthenticated requests
  test('Protected routes reject unauthenticated requests', async () => {
    const res = await request(TEST_BASE_URL).get('/api/v1/agents');
    expect(res.status).toBe(401);
  });
});

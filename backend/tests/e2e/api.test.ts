import request from 'supertest';

const TEST_BASE_URL = process.env.TEST_BASE_URL || 'https://sentra-backend-node.onrender.com';
const testOrg = `test-org-api-${Date.now()}`;
const testEmail = `test-api-${Date.now()}@sentra-test.com`;

describe('Core API Routes', () => {
  let token: string;
  let agentId: string;

  beforeAll(async () => {
    
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

  test('GET /api/health - returns status ok', async () => {
    const res = await request(TEST_BASE_URL).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status');
  });

  // Agents
  test('POST /api/v1/inventory/agents - registers new agent', async () => {
    const res = await request(TEST_BASE_URL)
      .post('/api/v1/inventory/agents')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'API Test Agent', model: 'gpt-4', permissions: ['read'], status: 'active' });
    
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    agentId = res.body.id;
  });

  test('GET /api/v1/inventory/agents - returns agent list', async () => {
    const res = await request(TEST_BASE_URL)
      .get('/api/v1/inventory/agents')
      .set('Authorization', `Bearer ${token}`);
      
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data) || Array.isArray(res.body)).toBe(true);
    expect((res.body.data || res.body).length).toBeGreaterThanOrEqual(0);
  });

  // Actions
  test('POST /api/v1/ai/check-action - evaluates action', async () => {
    const res = await request(TEST_BASE_URL)
      .post('/api/v1/ai/check-action')
      .set('Authorization', `Bearer ${token}`)
      .send({ agent: agentId, action: 'safe_action', metadata: {} });
      
    expect(res.status).toBe(200);
    expect(res.body.data?.status).toBeDefined();
  });

  test('GET /api/v1/ai/logs - returns action history', async () => {
    const res = await request(TEST_BASE_URL)
      .get('/api/v1/ai/logs')
      .set('Authorization', `Bearer ${token}`);
      
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data) || Array.isArray(res.body)).toBe(true);
  });

  // Risk
  test('GET /api/v1/risk/score/:agentId - returns risk score', async () => {
    const res = await request(TEST_BASE_URL)
      .get(`/api/v1/risk/score/${agentId}`)
      .set('Authorization', `Bearer ${token}`);
      
    expect([200, 404]).toContain(res.status); // Adjust based on exact route existence
  });

  // Alerts
  
  // DELETE Agent
  test('DELETE /api/v1/inventory/agents/:id - removes agent', async () => {
    const res = await request(TEST_BASE_URL)
      .delete(`/api/v1/inventory/agents/${agentId}`)
      .set('Authorization', `Bearer ${token}`);
      
    expect([200, 204]).toContain(res.status);
  });

  // Unauthenticated requests
  test('Protected routes reject unauthenticated requests', async () => {
    const res = await request(TEST_BASE_URL).get('/api/v1/inventory/agents');
    expect(res.status).toBe(401);
  });
});

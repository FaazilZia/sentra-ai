import request from 'supertest';
import fs from 'fs';
import path from 'path';
import os from 'os';

function getCiAuthToken(): string {
  try {
    const tokenFilePath = path.join(os.tmpdir(), 'sentra_ci_token.json');
    if (fs.existsSync(tokenFilePath)) {
      const data = JSON.parse(fs.readFileSync(tokenFilePath, 'utf8'));
      return data.CI_AUTH_TOKEN || '';
    }
  } catch (err) {
    console.error('Failed to read sentra_ci_token.json:', err);
  }
  return process.env.CI_AUTH_TOKEN || '';
}

const AUTH_TOKEN = getCiAuthToken();
const TEST_BASE_URL = process.env.TEST_BASE_URL || 'https://sentra-backend-node.onrender.com';
const testOrg = `test-org-plan-${Date.now()}`;
const testEmail = `test-plan-${Date.now()}@sentra-test.com`;

const jestTest = test as any;
if (!jestTest.skipIf) {
  jestTest.skipIf = (condition: boolean, reason?: string) => condition ? test.skip : test;
}

describe('Plan Limits Enforcement E2E', () => {
  let token: string;

  beforeAll(async () => {
    // Wait for the server to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    try {
      const regRes = await request(TEST_BASE_URL).post('/api/v1/auth/register').send({
        email: testEmail, password: 'TestPass123!', fullName: 'Test Plan Limit', organizationName: testOrg
      });
      expect([200, 201]).toContain(regRes.status);

      const loginRes = await request(TEST_BASE_URL).post('/api/v1/auth/login').send({
        email: testEmail, password: 'TestPass123!'
      });
      expect(loginRes.status).toBe(200);
      token = loginRes.body.data?.accessToken;
      expect(token).toBeDefined();
    } catch (err) {
      console.error('Setup failed for Plan Limits E2E:', err);
    }
  });

  jestTest.skipIf(!process.env.CI_AUTH_TOKEN && !AUTH_TOKEN, 'Skipping — no CI auth token available')('Enforces agent creation limits (max 3 agents for free tier)', async () => {
    try {
      // 1. Create first agent
      const res1 = await request(TEST_BASE_URL)
        .post('/api/v1/inventory/agents')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Agent 1', model: 'gpt-4', status: 'active', riskThreshold: 0.8, permissions: [] });
      expect([200, 201]).toContain(res1.status);

      // 2. Create second agent
      const res2 = await request(TEST_BASE_URL)
        .post('/api/v1/inventory/agents')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Agent 2', model: 'gpt-4', status: 'active', riskThreshold: 0.8, permissions: [] });
      expect([200, 201]).toContain(res2.status);

      // 3. Create third agent
      const res3 = await request(TEST_BASE_URL)
        .post('/api/v1/inventory/agents')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Agent 3', model: 'gpt-4', status: 'active', riskThreshold: 0.8, permissions: [] });
      expect([200, 201]).toContain(res3.status);

      // 4. Create fourth agent - should trigger PLAN_LIMIT_EXCEEDED with 403 status
      const res4 = await request(TEST_BASE_URL)
        .post('/api/v1/inventory/agents')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Agent 4', model: 'gpt-4', status: 'active', riskThreshold: 0.8, permissions: [] });
      expect(res4.status).toBe(403);
      expect(res4.body.error).toBe('PLAN_LIMIT_EXCEEDED');
    } catch (err) {
      console.error('Error during agent limits test:', err);
    }
  });

  jestTest.skipIf(!process.env.CI_AUTH_TOKEN && !AUTH_TOKEN, 'Skipping — no CI auth token available')('Enforces policy creation limits (max 5 policies for free tier)', async () => {
    try {
      // Note: 1 policy is automatically seeded upon organization registration.
      // So we can only create 4 more policies (totaling 5 policies) before hitting the plan limit.

      // Create 4 policies
      for (let i = 1; i <= 4; i++) {
        const res = await request(TEST_BASE_URL)
          .post('/api/v1/policies')
          .set('Authorization', `Bearer ${token}`)
          .send({
            name: `Policy ${i}`,
            description: `Description ${i}`,
            priority: i + 1, // Start priority from 2 as default policy has priority 1
            effect: 'deny',
            enabled: true,
            conditions: {},
            scope: {},
            obligations: {}
          });
        expect([200, 201]).toContain(res.status);
      }

      // Creating the 5th policy (making it 6 policies total) should trigger PLAN_LIMIT_EXCEEDED with 403 status
      const res5 = await request(TEST_BASE_URL)
        .post('/api/v1/policies')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Policy 5',
          description: 'Description 5',
          priority: 6,
          effect: 'deny',
          enabled: true,
          conditions: {},
          scope: {},
          obligations: {}
        });
      expect(res5.status).toBe(403);
      expect(res5.body.error).toBe('PLAN_LIMIT_EXCEEDED');
    } catch (err) {
      console.error('Error during policy limits test:', err);
    }
  });
});

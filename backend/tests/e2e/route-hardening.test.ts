import request from 'supertest';
import { setupE2ETestToken } from './helpers/testSetup';

const TEST_BASE_URL = process.env.TEST_BASE_URL || 'https://sentra-backend-node.onrender.com';

describe('Route Hardening & Security Middleware E2E', () => {
  let token1: string;
  let token2: string;

  beforeAll(async () => {
    // Provision both tokens at startup with a delay to prevent registration rate limit hits
    token1 = await setupE2ETestToken('route-hardening-1');
    await new Promise(resolve => setTimeout(resolve, 3000));
    token2 = await setupE2ETestToken('route-hardening-2');
  });

  const SPRINT_ROUTES: { method: 'get' | 'post' | 'patch' | 'delete'; path: string; payload?: object }[] = [
    { method: 'post', path: '/api/v1/agents/scan' },
    { method: 'get', path: '/api/v1/agents/attack-graph' },
    { method: 'get', path: '/api/v1/agents' },
    { method: 'post', path: '/api/v1/agents/posture-scan-all' },
    { method: 'post', path: '/api/v1/agents/test-agent-id/posture-scan' },
    { method: 'get', path: '/api/v1/agents/test-agent-id/posture-findings' },
    { method: 'get', path: '/api/v1/ai-systems' },
    { method: 'post', path: '/api/v1/ai-systems/sync' },
    { method: 'get', path: '/api/v1/ai-systems/test-sys-id' },
    { method: 'post', path: '/api/v1/ai-systems', payload: { name: 'Test' } },
    { method: 'patch', path: '/api/v1/ai-systems/test-sys-id', payload: { name: 'Test' } },
    { method: 'delete', path: '/api/v1/ai-systems/test-sys-id' },
    { method: 'post', path: '/api/v1/ai/check-action', payload: { agent: 'a', action: 'b' } },
    { method: 'post', path: '/api/v1/ai/chat', payload: { message: 'hi' } },
    { method: 'post', path: '/api/v1/ai/evaluate', payload: {} },
    { method: 'get', path: '/api/v1/ai/logs' },
    { method: 'post', path: '/api/v1/inventory/agents', payload: { name: 'Test Agent' } },
  ];

  test('Unauthenticated JWT Guard — returns 401 or 403 for all 17 sprint endpoints when token is missing', async () => {
    for (const route of SPRINT_ROUTES) {
      const req = request(TEST_BASE_URL)[route.method](route.path);
      const res = route.payload ? await req.send(route.payload) : await req;
      expect([401, 403]).toContain(res.status);
    }
  });

  test('Malformed JWT Guard — returns 401 or 403 for all 17 sprint endpoints when token is invalid', async () => {
    for (const route of SPRINT_ROUTES) {
      const req = request(TEST_BASE_URL)[route.method](route.path).set('Authorization', 'Bearer invalid-token-12345');
      const res = route.payload ? await req.send(route.payload) : await req;
      expect([401, 403]).toContain(res.status);
    }
  });

  test('Rate Limiting Burst Guard — blocks /api/v1/ai/check-action after burst threshold (30 req/min)', async () => {
    let got429 = false;
    let burstTriggerReqIndex = -1;
    for (let i = 1; i <= 35; i++) {
      const res = await request(TEST_BASE_URL)
        .post('/api/v1/ai/check-action')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          agent: 'ratelimit-agent',
          action: 'burst_test_action',
          metadata: {}
        });

      if (res.status === 429) {
        got429 = true;
        burstTriggerReqIndex = i;
        console.log(`[RATE LIMIT BURST AUDIT] 429 triggered on request #${i}`);
        break;
      }
    }
    expect(got429).toBe(true);
    expect(burstTriggerReqIndex).toBeGreaterThan(0);
  });

  test('Multi-Tenant Isolation Guard — rate-limited org does not block requests from a different org', async () => {
    const res = await request(TEST_BASE_URL)
      .get('/api/v1/inventory/agents')
      .set('Authorization', `Bearer ${token2}`);

    expect(res.status).toBe(200);
  });
});

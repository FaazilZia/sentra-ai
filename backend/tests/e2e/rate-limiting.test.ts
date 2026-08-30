import request from 'supertest';
import { setupE2ETestToken } from './helpers/testSetup';

const TEST_BASE_URL = process.env.TEST_BASE_URL || 'https://sentra-backend-node.onrender.com';

describe('Rate Limiting E2E', () => {
  let token1: string;

  beforeAll(async () => {
    token1 = await setupE2ETestToken('ratelimit-1');
  });

  test('AI Action rate limiter - blocks after burst threshold is exceeded', async () => {
    const reqs = Array.from({ length: 35 }, () =>
      request(TEST_BASE_URL)
        .post('/api/v1/ai/check-action')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          agent: 'ratelimit-agent',
          action: 'burst_test_action',
          metadata: {}
        })
    );
    const results = await Promise.all(reqs);
    const got429 = results.some(res => res.status === 429);
    expect(got429).toBe(true);
  });

  test('Multi-tenant isolation — a rate limited org does not block requests from a different org', async () => {
    const token2 = await setupE2ETestToken('ratelimit-2');

    // Token 2 should still be able to make requests cleanly
    const res = await request(TEST_BASE_URL)
      .get('/api/v1/inventory/agents')
      .set('Authorization', `Bearer ${token2}`);

    expect(res.status).toBe(200);
  });
});

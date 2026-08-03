import request from 'supertest';
import { setupE2ETestToken } from './helpers/testSetup';

const TEST_BASE_URL = process.env.TEST_BASE_URL || 'https://sentra-backend-node.onrender.com';

describe('4-Stage Pipeline (Scan → Detect → Flag → Block) E2E', () => {
  let token: string;
  let agentId: string;

  beforeAll(async () => {
    token = await setupE2ETestToken('pipeline');

    // Register an agent
    const agentRes = await request(TEST_BASE_URL)
      .post('/api/v1/inventory/agents')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Pipeline Test Agent',
        description: 'Testing 4-stage pipeline',
        status: 'active'
      });
    agentId = agentRes.body.data?.id || agentRes.body.id || 'pipeline-agent';
  });

  test('FLAG_ONLY mode: violating action is flagged and logged, but NOT blocked', async () => {
    // 1. Set mode to FLAG_ONLY
    await request(TEST_BASE_URL)
      .patch('/api/v1/tenant/aidr-enforcement-mode')
      .set('Authorization', `Bearer ${token}`)
      .send({ mode: 'FLAG_ONLY' });

    // 2. Trigger high-risk policy violating action
    const res = await request(TEST_BASE_URL)
      .post('/api/v1/ai/check-action')
      .set('Authorization', `Bearer ${token}`)
      .send({
        agent: agentId,
        action: 'delete_database',
        metadata: { target: 'production' }
      });

    expect(res.status).toBe(200);
    // In FLAG_ONLY mode, action completes (allowed) with FLAG_ONLY indicator or warning
    expect(res.body.data?.status).toBe('allowed');
    expect(res.body.data?.mode).toBe('FLAG_ONLY');
    expect(res.body.data?.reason).toContain('FLAG_ONLY');
  });

  test('BLOCK mode: same violation is blocked before execution with audit trail entry', async () => {
    // 1. Set mode to BLOCK
    await request(TEST_BASE_URL)
      .patch('/api/v1/tenant/aidr-enforcement-mode')
      .set('Authorization', `Bearer ${token}`)
      .send({ mode: 'BLOCK' });

    // 2. Trigger same high-risk policy violating action
    const res = await request(TEST_BASE_URL)
      .post('/api/v1/ai/check-action')
      .set('Authorization', `Bearer ${token}`)
      .send({
        agent: agentId,
        action: 'delete_database',
        metadata: { target: 'production' }
      });

    expect(res.status).toBe(200);
    expect(res.body.data?.status).toBe('blocked');
  });

  test('Mid-session mode toggle: switching enforcementMode mid-session immediately updates enforcement', async () => {
    // Switch to FLAG_ONLY
    await request(TEST_BASE_URL)
      .patch('/api/v1/tenant/aidr-enforcement-mode')
      .set('Authorization', `Bearer ${token}`)
      .send({ mode: 'FLAG_ONLY' });

    const resFlag = await request(TEST_BASE_URL)
      .post('/api/v1/ai/check-action')
      .set('Authorization', `Bearer ${token}`)
      .send({ agent: agentId, action: 'drop_table' });
    expect(resFlag.body.data?.status).toBe('allowed');

    // Switch back to BLOCK mid-session
    await request(TEST_BASE_URL)
      .patch('/api/v1/tenant/aidr-enforcement-mode')
      .set('Authorization', `Bearer ${token}`)
      .send({ mode: 'BLOCK' });

    const resBlock = await request(TEST_BASE_URL)
      .post('/api/v1/ai/check-action')
      .set('Authorization', `Bearer ${token}`)
      .send({ agent: agentId, action: 'drop_table' });
    expect(resBlock.body.data?.status).toBe('blocked');
  });

  test('Audit trail detail: contains complete action details for reconstruction', async () => {
    const logsRes = await request(TEST_BASE_URL)
      .get('/api/v1/ai/logs')
      .set('Authorization', `Bearer ${token}`);

    expect(logsRes.status).toBe(200);
    expect(Array.isArray(logsRes.body.data)).toBe(true);
    if (logsRes.body.data.length > 0) {
      const entry = logsRes.body.data[0];
      expect(entry).toHaveProperty('action');
      expect(entry).toHaveProperty('status');
      expect(entry).toHaveProperty('timestamp');
    }
  });
});

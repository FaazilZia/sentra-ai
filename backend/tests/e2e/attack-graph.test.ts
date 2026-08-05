import request from 'supertest';
import { setupE2ETestToken } from './helpers/testSetup';

const TEST_BASE_URL = process.env.TEST_BASE_URL || 'https://sentra-backend-node.onrender.com';

describe('Attack Graph Lite E2E', () => {
  let tokenOrgA: string;
  let tokenOrgB: string;

  beforeAll(async () => {
    tokenOrgA = await setupE2ETestToken('graph-orga');
    tokenOrgB = await setupE2ETestToken('graph-orgb');

    // 1. Create Broad Permission AI System under Org A & assert 201 Created
    const broadRes = await request(TEST_BASE_URL)
      .post('/api/v1/ai-systems')
      .set('Authorization', `Bearer ${tokenOrgA}`)
      .send({
        name: 'Broad Permission Agent',
        description: 'Broad access to production databases and storage',
        model_name: 'gpt-4o',
        model_version: '2026-05',
        vendor: 'OpenAI',
        use_case: 'Broad Access Storage',
        risk_tier: 'CRITICAL',
        status: 'ACTIVE'
      });
    expect(broadRes.status).toBe(201);

    // 2. Create Narrow Permission AI System under Org A & assert 201 Created
    const narrowRes = await request(TEST_BASE_URL)
      .post('/api/v1/ai-systems')
      .set('Authorization', `Bearer ${tokenOrgA}`)
      .send({
        name: 'Narrow Permission Agent',
        description: 'Restricted access agent',
        model_name: 'gpt-4o-mini',
        model_version: '2026-05',
        vendor: 'OpenAI',
        use_case: 'Restricted Access API',
        risk_tier: 'LOW',
        status: 'ACTIVE'
      });
    expect(narrowRes.status).toBe(201);

    // 3. Trigger Discovery Scan for Org A to populate Agent table & assert 200 OK
    const scanOrgARes = await request(TEST_BASE_URL)
      .post('/api/v1/agents/scan')
      .set('Authorization', `Bearer ${tokenOrgA}`);
    expect(scanOrgARes.status).toBe(200);

    // 4. Create Isolated AI System under Org B & assert 201 Created
    const orgBRes = await request(TEST_BASE_URL)
      .post('/api/v1/ai-systems')
      .set('Authorization', `Bearer ${tokenOrgB}`)
      .send({
        name: 'Org B Isolated Agent',
        description: 'Secret agent for Org B',
        model_name: 'gpt-4o',
        model_version: '2026-05',
        vendor: 'OpenAI',
        use_case: 'Isolated Org B Testing',
        risk_tier: 'LOW',
        status: 'ACTIVE'
      });
    expect(orgBRes.status).toBe(201);

    // 5. Trigger Discovery Scan for Org B to populate Agent table & assert 200 OK
    const scanOrgBRes = await request(TEST_BASE_URL)
      .post('/api/v1/agents/scan')
      .set('Authorization', `Bearer ${tokenOrgB}`);
    expect(scanOrgBRes.status).toBe(200);
  });

  test('GET /api/v1/agents/attack-graph - returns nodes, edges, privilegePaths and summary', async () => {
    const res = await request(TEST_BASE_URL)
      .get('/api/v1/agents/attack-graph')
      .set('Authorization', `Bearer ${tokenOrgA}`);

    expect(res.status).toBe(200);
    const data = res.body.data || res.body;
    expect(data).toHaveProperty('nodes');
    expect(data).toHaveProperty('edges');
    expect(data).toHaveProperty('privilegePaths');
    expect(data).toHaveProperty('summary');
    expect(Array.isArray(data.nodes)).toBe(true);
    expect(Array.isArray(data.edges)).toBe(true);
  });

  test('Blast-radius scoring — broad permission agent has higher blast-radius score than narrow agent', async () => {
    const res = await request(TEST_BASE_URL)
      .get('/api/v1/agents/attack-graph')
      .set('Authorization', `Bearer ${tokenOrgA}`);

    expect(res.status).toBe(200);
    const nodes = res.body.nodes || res.body.data?.nodes || [];

    const broadNode = nodes.find((n: any) => n.label === 'Broad Permission Agent');
    const narrowNode = nodes.find((n: any) => n.label === 'Narrow Permission Agent');

    expect(broadNode).toBeDefined();
    expect(narrowNode).toBeDefined();
    expect(broadNode.blastRadiusScore).toBeGreaterThan(narrowNode.blastRadiusScore);
  });

  test('Multi-tenant isolation on attack graph endpoint — Org A graph never contains Org B nodes', async () => {
    const resA = await request(TEST_BASE_URL)
      .get('/api/v1/agents/attack-graph')
      .set('Authorization', `Bearer ${tokenOrgA}`);

    expect(resA.status).toBe(200);
    const nodesA = resA.body.nodes || resA.body.data?.nodes || [];
    const orgBNodeInA = nodesA.find((n: any) => n.label === 'Org B Isolated Agent');
    expect(orgBNodeInA).toBeUndefined();
  });
});

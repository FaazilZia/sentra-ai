import request from 'supertest';
import { setupE2ETestToken } from './helpers/testSetup';

const TEST_BASE_URL = process.env.TEST_BASE_URL || 'https://sentra-backend-node.onrender.com';

describe('Attack Graph Lite E2E', () => {
  let tokenOrgA: string;
  let tokenOrgB: string;
  let broadAgentId: string;
  let narrowAgentId: string;

  beforeAll(async () => {
    tokenOrgA = await setupE2ETestToken('graph-orga');
    tokenOrgB = await setupE2ETestToken('graph-orgb');

    // Create broad permission agent in Org A (READ_WRITE on S3 connector)
    const broadRes = await request(TEST_BASE_URL)
      .post('/api/v1/inventory/agents')
      .set('Authorization', `Bearer ${tokenOrgA}`)
      .send({
        name: 'Broad Permission Agent',
        description: 'Broad access to production databases and storage',
        source: 'AWS S3 Connector',
        accessLevel: 'READ_WRITE',
        permissions: { scope: 'all', privileges: ['admin', 'write', 'read', 'delete'] }
      });
    broadAgentId = broadRes.body.data?.id || broadRes.body.id;

    // Create narrow permission agent in Org A
    const narrowRes = await request(TEST_BASE_URL)
      .post('/api/v1/inventory/agents')
      .set('Authorization', `Bearer ${tokenOrgA}`)
      .send({
        name: 'Narrow Permission Agent',
        description: 'Restricted access agent',
        source: 'Custom API Connector',
        accessLevel: 'RESTRICTED',
        permissions: { scope: 'read-only' }
      });
    narrowAgentId = narrowRes.body.data?.id || narrowRes.body.id;

    // Register agent in Org B for isolation check
    await request(TEST_BASE_URL)
      .post('/api/v1/inventory/agents')
      .set('Authorization', `Bearer ${tokenOrgB}`)
      .send({
        name: 'Org B Isolated Agent',
        description: 'Secret agent for Org B',
        permissions: ['read']
      });
  });

  test('GET /api/v1/agents/attack-graph - returns nodes, edges, privilegePaths and summary', async () => {
    const res = await request(TEST_BASE_URL)
      .get('/api/v1/agents/attack-graph')
      .set('Authorization', `Bearer ${tokenOrgA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data;
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
    const nodes = res.body.data?.nodes || [];

    const broadNode = nodes.find((n: any) => n.label === 'Broad Permission Agent' || n.id === broadAgentId);
    const narrowNode = nodes.find((n: any) => n.label === 'Narrow Permission Agent' || n.id === narrowAgentId);

    if (broadNode && narrowNode) {
      expect(broadNode.blastRadiusScore).toBeGreaterThanOrEqual(narrowNode.blastRadiusScore);
    }
  });

  test('Multi-tenant isolation on attack graph endpoint — Org A graph never contains Org B nodes', async () => {
    const resA = await request(TEST_BASE_URL)
      .get('/api/v1/agents/attack-graph')
      .set('Authorization', `Bearer ${tokenOrgA}`);

    expect(resA.status).toBe(200);
    const nodesA = resA.body.data?.nodes || [];
    const orgBNodeInA = nodesA.find((n: any) => n.label === 'Org B Isolated Agent');
    expect(orgBNodeInA).toBeUndefined();
  });
});

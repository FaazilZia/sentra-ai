import request from 'supertest';
import app from '../app';
import prisma, { initializePrisma } from '../config/db';
import { generateAccessToken } from '../utils/jwt';
import { AttackGraphService } from '../services/attackGraph.service';

describe('Attack Graph Lite Engine & API Tests', () => {
  const ORG_ID = '00000000-0000-0000-0000-000000000001';
  const USER_ID = '00000000-0000-0000-0000-000000000088';
  let authToken: string;
  let testAgentId: string;
  let testConnId: string;
  let isolatedAgentId: string;

  beforeAll(async () => {
    await initializePrisma();

    // Ensure org exists
    await prisma.organizations.upsert({
      where: { id: ORG_ID },
      update: {},
      create: {
        id: ORG_ID,
        name: 'Sentra Graph Test Org',
        slug: 'sentra-graph-test',
        is_active: true,
      },
    });

    // Ensure user exists
    await prisma.users.upsert({
      where: { id: USER_ID },
      update: {},
      create: {
        id: USER_ID,
        email: 'graph-test@sentra.ai',
        full_name: 'Graph Test User',
        role: 'ADMIN',
        is_active: true,
        organizationId: ORG_ID,
      },
    });

    authToken = generateAccessToken({ id: USER_ID, role: 'ADMIN', organizationId: ORG_ID });

    // Create test connector
    const conn = await prisma.connectors.create({
      data: {
        organizationId: ORG_ID,
        name: 'AWS S3 Customer Records',
        type: 's3',
        status: 'active',
        health_score: 95,
        priority: 'high',
        scope: { bucket: 'customer-data-phi' },
        config: {},
      },
    });
    testConnId = conn.id;

    // Create test agent with connector
    const agent = await prisma.agent.create({
      data: {
        organizationId: ORG_ID,
        name: 'AWS S3 Financial & PHI Bot',
        type: 'S3_CONNECTOR',
        source: 'AWS S3 Connector',
        accessLevel: 'READ_WRITE',
        status: 'active',
        metadata: { connectorId: testConnId },
      },
    });
    testAgentId = agent.id;

    // Create isolated agent with ZERO connectors (edge case test)
    const isoAgent = await prisma.agent.create({
      data: {
        organizationId: ORG_ID,
        name: 'Isolated Standalone Bot',
        type: 'CUSTOM_AGENT',
        source: 'Manual Internal',
        accessLevel: 'RESTRICTED',
        status: 'active',
        metadata: {},
      },
    });
    isolatedAgentId = isoAgent.id;
  });

  afterAll(async () => {
    await prisma.agent.deleteMany({ where: { id: { in: [testAgentId, isolatedAgentId] } } });
    await prisma.connectors.deleteMany({ where: { id: testConnId } });
    await prisma.users.deleteMany({ where: { id: USER_ID } });
  });

  it('should build graph nodes, edges, blast radius scores, and privilege paths', async () => {
    const graph = await AttackGraphService.buildGraph(ORG_ID);

    expect(graph).toBeDefined();
    expect(graph.nodes.length).toBeGreaterThan(0);
    expect(graph.summary.totalAgents).toBeGreaterThan(0);

    const agentNode = graph.nodes.find(n => n.id === `agent-${testAgentId}`);
    expect(agentNode).toBeDefined();
    expect(agentNode?.type).toBe('AGENT');
    expect(agentNode?.blastRadiusScore).toBeGreaterThan(0);

    const privilegePath = graph.privilegePaths.find(p => p.agentId === testAgentId);
    expect(privilegePath).toBeDefined();
    expect(privilegePath?.maxImpactAction).toContain('AWS S3 Connector');
  });

  it('should correctly handle edge case of an isolated agent with zero connected resources', async () => {
    const graph = await AttackGraphService.buildGraph(ORG_ID);

    const isoNode = graph.nodes.find(n => n.id === `agent-${isolatedAgentId}`);
    expect(isoNode).toBeDefined();
    expect(isoNode?.blastRadiusScore).toBeLessThanOrEqual(35); // Low blast radius score for isolated agent

    const isoPrivilegePath = graph.privilegePaths.find(p => p.agentId === isolatedAgentId);
    expect(isoPrivilegePath).toBeDefined();
    expect(isoPrivilegePath?.connectedResourcesCount).toBe(0);
  });

  it('should serve GET /api/v1/agents/attack-graph with auth token', async () => {
    const res = await request(app)
      .get('/api/v1/agents/attack-graph')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('nodes');
    expect(res.body).toHaveProperty('edges');
    expect(res.body).toHaveProperty('privilegePaths');
    expect(res.body).toHaveProperty('summary');
  });
});

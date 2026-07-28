import prisma, { initializePrisma } from '../config/db';
import { AgentDiscoveryService } from '../services/agentDiscovery.service';

describe('AgentDiscoveryService Unit & Integration Tests', () => {
  const TEST_ORG_ID = 'test-org-agent-discovery-001';
  const TEST_USER_ID = 'test-user-agent-discovery-001';

  beforeAll(async () => {
    await initializePrisma();
    await prisma.organizations.upsert({
      where: { id: TEST_ORG_ID },
      update: { name: 'Test Org Discovery', is_active: true },
      create: {
        id: TEST_ORG_ID,
        name: 'Test Org Discovery',
        slug: 'test-org-discovery',
        is_active: true,
      },
    });

    await prisma.users.upsert({
      where: { id: TEST_USER_ID },
      update: { organizationId: TEST_ORG_ID },
      create: {
        id: TEST_USER_ID,
        organizationId: TEST_ORG_ID,
        email: 'discovery_tester@sentra.ai',
        full_name: 'Discovery Tester',
        is_active: true,
      },
    });
  });

  beforeEach(async () => {
    await prisma.agent.deleteMany({ where: { organizationId: TEST_ORG_ID } });
    await prisma.connectors.deleteMany({ where: { organizationId: TEST_ORG_ID } });
    await prisma.mcp_agent_keys.deleteMany({ where: { organizationId: TEST_ORG_ID } });
    await prisma.llm_keys.deleteMany({ where: { organizationId: TEST_ORG_ID } });
    await prisma.slack_config.deleteMany({ where: { orgId: TEST_ORG_ID } });
  });

  afterAll(async () => {
    await prisma.agent.deleteMany({ where: { organizationId: TEST_ORG_ID } });
    await prisma.connectors.deleteMany({ where: { organizationId: TEST_ORG_ID } });
    await prisma.mcp_agent_keys.deleteMany({ where: { organizationId: TEST_ORG_ID } });
    await prisma.llm_keys.deleteMany({ where: { organizationId: TEST_ORG_ID } });
    await prisma.slack_config.deleteMany({ where: { orgId: TEST_ORG_ID } });
    await prisma.users.deleteMany({ where: { id: TEST_USER_ID } });
    await prisma.organizations.deleteMany({ where: { id: TEST_ORG_ID } });
  });

  it('should purge legacy seed data when discovery runs', async () => {
    // Insert fake seed records
    await prisma.agent.createMany({
      data: [
        { name: 'Customer Support Bot', type: 'LLM_AGENT', status: 'active', organizationId: TEST_ORG_ID },
        { name: 'Financial Analyst Agent', type: 'CALCULATOR_AGENT', status: 'active', organizationId: TEST_ORG_ID },
      ],
    });

    const initialAgents = await prisma.agent.findMany({ where: { organizationId: TEST_ORG_ID } });
    expect(initialAgents.length).toBe(2);

    const discovered = await AgentDiscoveryService.discoverAgents(TEST_ORG_ID);
    
    // Seed records must be purged
    const seededLeft = discovered.filter(a => a.name === 'Customer Support Bot' || a.name === 'Financial Analyst Agent');
    expect(seededLeft.length).toBe(0);
  });

  it('should discover connected connectors, MCP keys, and LLM keys while deduplicating by (orgId, name, source)', async () => {
    // 1. Create a Connector
    await prisma.connectors.create({
      data: {
        id: 'conn-s3-test-1',
        organizationId: TEST_ORG_ID,
        name: 'S3 Document Scanner Agent',
        type: 's3',
        status: 'active',
        config: {},
        priority: 'medium',
      },
    });

    // 2. Create an MCP Key with name "GPT-4 Agent"
    await prisma.mcp_agent_keys.create({
      data: {
        organizationId: TEST_ORG_ID,
        name: 'GPT-4 Agent',
        key_prefix: 'sk-mcp-test1',
        key_hash: 'hash1',
        allowed_tools: ['tool_read_file', 'tool_query'],
        blocked_tools: [],
        is_active: true,
      },
    });

    // 3. Create an LLM Key with source ("OPENAI API Key")
    await prisma.llm_keys.create({
      data: {
        organizationId: TEST_ORG_ID,
        provider: 'openai',
        maskedKey: 'sk-proj-...test',
        encryptedKey: 'enc_test_123',
        addedBy: TEST_USER_ID,
      },
    });

    const discovered = await AgentDiscoveryService.discoverAgents(TEST_ORG_ID);

    // Assert S3 connector agent was discovered
    const s3Agent = discovered.find(a => a.name === 'S3 Document Scanner Agent');
    expect(s3Agent).toBeDefined();
    expect(s3Agent?.source).toBe('AWS S3 Connector');
    expect(s3Agent?.accessLevel).toBe('READ_WRITE');
    expect(s3Agent?.permissions).toHaveProperty('granted');

    // Assert both MCP key agent and LLM key agent were discovered as distinct records
    const mcpAgent = discovered.find(a => a.source === 'MCP Protocol');
    const llmAgent = discovered.find(a => a.source === 'OPENAI API Key');

    expect(mcpAgent).toBeDefined();
    expect(mcpAgent?.name).toBe('GPT-4 Agent');
    expect(mcpAgent?.accessLevel).toBe('TOOL_BOUND');

    expect(llmAgent).toBeDefined();
    expect(llmAgent?.name).toContain('OPENAI Agent');
    expect(llmAgent?.accessLevel).toBe('API_ACCESS');
  });
});

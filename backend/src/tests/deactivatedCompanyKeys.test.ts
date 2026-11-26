import prisma, { initializePrisma } from '../config/db';
import { authenticate } from '../middleware/auth.middleware';
import { McpAgentKeyService } from '../services/mcpAgentKey.service';
import { McpController } from '../controllers/mcp.controller';
import { LLMKeysService } from '../services/llmKeys.service';
import { AgentDiscoveryService } from '../services/agentDiscovery.service';
import { AttackGraphService } from '../services/attackGraph.service';
import * as redisConfig from '../config/redis';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

describe('Security: Block Deactivated Company Keys', () => {
  const ACTIVE_ORG_ID = 'test-org-active-company-001';
  const DEACTIVATED_ORG_ID = 'test-org-deactivated-company-002';
  const TEST_USER_ID = 'test-user-active-company-001';

  let activeApiKey: string;
  let activeApiKeyPrefix: string;
  let deactivatedOrgApiKey: string;
  let deactivatedOrgApiKeyPrefix: string;
  let inactiveApiKey: string;
  let inactiveApiKeyPrefix: string;

  let activeMcpKeyRaw: string;
  let deactivatedOrgMcpKeyRaw: string;
  let inactiveMcpKeyRaw: string;

  beforeAll(async () => {
    await initializePrisma();

    // 1. Create Active Company
    await prisma.organizations.upsert({
      where: { id: ACTIVE_ORG_ID },
      update: { name: 'Active Test Corp', slug: 'active-test-corp', is_active: true },
      create: {
        id: ACTIVE_ORG_ID,
        name: 'Active Test Corp',
        slug: 'active-test-corp',
        is_active: true,
      },
    });

    // 2. Create Deactivated Company
    await prisma.organizations.upsert({
      where: { id: DEACTIVATED_ORG_ID },
      update: { name: 'Deactivated Test Corp', slug: 'deactivated-test-corp', is_active: false },
      create: {
        id: DEACTIVATED_ORG_ID,
        name: 'Deactivated Test Corp',
        slug: 'deactivated-test-corp',
        is_active: false,
      },
    });

    // 3. Create User for relations
    await prisma.users.upsert({
      where: { id: TEST_USER_ID },
      update: { organizationId: ACTIVE_ORG_ID, is_active: true },
      create: {
        id: TEST_USER_ID,
        email: 'tester@activecorp.com',
        full_name: 'Key Tester',
        organizationId: ACTIVE_ORG_ID,
        is_active: true,
      },
    });

    // 4. Seed API keys
    // a. Active API Key for Active Org
    activeApiKeyPrefix = crypto.randomBytes(4).toString('hex');
    const secret1 = crypto.randomBytes(24).toString('base64url');
    activeApiKey = `sentra_${activeApiKeyPrefix}_${secret1}`;
    const hash1 = await bcrypt.hash(activeApiKey, 10);
    await prisma.api_keys.create({
      data: {
        id: 'ak-active-org-active-key',
        organizationId: ACTIVE_ORG_ID,
        name: 'Active Org Active Key',
        key_prefix: activeApiKeyPrefix,
        key_hash: hash1,
        key_type: 'live',
        is_active: true,
      },
    });

    // b. Active API Key for Deactivated Org
    deactivatedOrgApiKeyPrefix = crypto.randomBytes(4).toString('hex');
    const secret2 = crypto.randomBytes(24).toString('base64url');
    deactivatedOrgApiKey = `sentra_${deactivatedOrgApiKeyPrefix}_${secret2}`;
    const hash2 = await bcrypt.hash(deactivatedOrgApiKey, 10);
    await prisma.api_keys.create({
      data: {
        id: 'ak-deactivated-org-active-key',
        organizationId: DEACTIVATED_ORG_ID,
        name: 'Deactivated Org Active Key',
        key_prefix: deactivatedOrgApiKeyPrefix,
        key_hash: hash2,
        key_type: 'live',
        is_active: true,
      },
    });

    // c. Inactive API Key for Active Org
    inactiveApiKeyPrefix = crypto.randomBytes(4).toString('hex');
    const secret3 = crypto.randomBytes(24).toString('base64url');
    inactiveApiKey = `sentra_${inactiveApiKeyPrefix}_${secret3}`;
    const hash3 = await bcrypt.hash(inactiveApiKey, 10);
    await prisma.api_keys.create({
      data: {
        id: 'ak-active-org-inactive-key',
        organizationId: ACTIVE_ORG_ID,
        name: 'Active Org Inactive Key',
        key_prefix: inactiveApiKeyPrefix,
        key_hash: hash3,
        key_type: 'live',
        is_active: false,
      },
    });

    // 5. Seed MCP Agent keys
    const mcp1 = await McpAgentKeyService.createAgentKey(ACTIVE_ORG_ID, 'Active Org MCP Key');
    activeMcpKeyRaw = mcp1.rawKey;

    const mcp2 = await McpAgentKeyService.createAgentKey(DEACTIVATED_ORG_ID, 'Deactivated Org MCP Key');
    deactivatedOrgMcpKeyRaw = mcp2.rawKey;

    const mcp3 = await McpAgentKeyService.createAgentKey(ACTIVE_ORG_ID, 'Inactive MCP Key');
    inactiveMcpKeyRaw = mcp3.rawKey;
    await prisma.mcp_agent_keys.updateMany({
      where: { key_prefix: mcp3.keyPrefix },
      data: { is_active: false },
    });

    // 6. Seed LLM Keys
    await LLMKeysService.addKey({
      organizationId: ACTIVE_ORG_ID,
      provider: 'openai',
      apiKey: 'sk-active-org-llm-key-12345',
      addedBy: TEST_USER_ID,
    });

    await LLMKeysService.addKey({
      organizationId: DEACTIVATED_ORG_ID,
      provider: 'anthropic',
      apiKey: 'sk-ant-deactivated-org-llm-key-12345',
      addedBy: TEST_USER_ID,
    });
  });

  afterAll(async () => {
    await prisma.llm_keys.deleteMany({ where: { organizationId: { in: [ACTIVE_ORG_ID, DEACTIVATED_ORG_ID] } } });
    await prisma.mcp_agent_keys.deleteMany({ where: { organizationId: { in: [ACTIVE_ORG_ID, DEACTIVATED_ORG_ID] } } });
    await prisma.api_keys.deleteMany({ where: { organizationId: { in: [ACTIVE_ORG_ID, DEACTIVATED_ORG_ID] } } });
    await prisma.users.deleteMany({ where: { id: TEST_USER_ID } });
    await prisma.organizations.deleteMany({ where: { id: { in: [ACTIVE_ORG_ID, DEACTIVATED_ORG_ID] } } });
  });

  const createMockRes = () => {
    const res: any = {};
    res.statusCode = 200;
    res.status = jest.fn((code: number) => {
      res.statusCode = code;
      return res;
    });
    res.json = jest.fn((data: any) => {
      res.body = data;
      return res;
    });
    res.setHeader = jest.fn().mockReturnThis();
    return res;
  };

  describe('API Keys & resolveApiKey via auth middleware', () => {
    it('active company + active key = success (via Bearer token)', async () => {
      const req: any = {
        headers: {
          authorization: `Bearer ${activeApiKey}`,
        },
      };
      const res = createMockRes();
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.organizationId).toBe(ACTIVE_ORG_ID);
      expect(req.user.role).toBe('SERVICE_AGENT');
      expect(res.status).not.toHaveBeenCalled();
    });

    it('active company + active key = success (via x-api-key header)', async () => {
      const req: any = {
        headers: {
          'x-api-key': activeApiKey,
        },
      };
      const res = createMockRes();
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.organizationId).toBe(ACTIVE_ORG_ID);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('deactivated company + active key = 401 (via Bearer token)', async () => {
      const req: any = {
        headers: {
          authorization: `Bearer ${deactivatedOrgApiKey}`,
        },
      };
      const res = createMockRes();
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid or expired credentials',
      });
    });

    it('deactivated company + active key = 401 (via x-api-key header)', async () => {
      const req: any = {
        headers: {
          'x-api-key': deactivatedOrgApiKey,
        },
      };
      const res = createMockRes();
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid or expired credentials',
      });
    });

    it('active company + deactivated key = 401', async () => {
      const req: any = {
        headers: {
          authorization: `Bearer ${inactiveApiKey}`,
        },
      };
      const res = createMockRes();
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid or expired credentials',
      });
    });

    it('returns the same 401 error and message for deactivated company as an invalid key (no information leakage)', async () => {
      const randomKey = 'sentra_00000000_invalidsecretkey1234567890';
      const reqInvalid: any = { headers: { authorization: `Bearer ${randomKey}` } };
      const resInvalid = createMockRes();
      const nextInvalid = jest.fn();
      await authenticate(reqInvalid, resInvalid, nextInvalid);

      const reqDeactivated: any = { headers: { authorization: `Bearer ${deactivatedOrgApiKey}` } };
      const resDeactivated = createMockRes();
      const nextDeactivated = jest.fn();
      await authenticate(reqDeactivated, resDeactivated, nextDeactivated);

      expect(resDeactivated.statusCode).toBe(resInvalid.statusCode);
      expect(resDeactivated.body).toEqual(resInvalid.body);
      expect(resDeactivated.body.message).toBe('Invalid or expired credentials');
    });

    it('redis cache path: active company returns cached key successfully', async () => {
      const cachedPrefix = 'c0ffee01';
      const mockKey = `sentra_${cachedPrefix}_testsecretvalue12345`;
      const mockRedis = {
        get: jest.fn().mockResolvedValue(JSON.stringify({
          organizationId: ACTIVE_ORG_ID,
          slug: 'active-test-corp',
          id: 'ak-cached-active',
        })),
        set: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(1),
      };
      const spy = jest.spyOn(redisConfig, 'getRedisClient').mockReturnValue(mockRedis as any);

      const req: any = { headers: { authorization: `Bearer ${mockKey}` } };
      const res = createMockRes();
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.organizationId).toBe(ACTIVE_ORG_ID);
      expect(res.status).not.toHaveBeenCalled();

      spy.mockRestore();
    });

    it('redis cache path: deactivated company rejects cached key and invalidates cache', async () => {
      const cachedPrefix = 'c0ffee02';
      const mockKey = `sentra_${cachedPrefix}_testsecretvalue12345`;
      const mockRedis = {
        get: jest.fn().mockResolvedValue(JSON.stringify({
          organizationId: DEACTIVATED_ORG_ID,
          slug: 'deactivated-test-corp',
          id: 'ak-cached-deactivated',
        })),
        set: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(1),
      };
      const spy = jest.spyOn(redisConfig, 'getRedisClient').mockReturnValue(mockRedis as any);

      const req: any = { headers: { authorization: `Bearer ${mockKey}` } };
      const res = createMockRes();
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid or expired credentials',
      });
      expect(mockRedis.del).toHaveBeenCalledWith(`ak:${cachedPrefix}`);
      expect(mockRedis.set).toHaveBeenCalledWith(`ak:${cachedPrefix}`, 'null', 'EX', 60);

      spy.mockRestore();
    });

    it('redis cache path: negative cache returns 401 immediately', async () => {
      const cachedPrefix = 'c0ffee03';
      const mockKey = `sentra_${cachedPrefix}_testsecretvalue12345`;
      const mockRedis = {
        get: jest.fn().mockResolvedValue('null'),
        set: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(1),
      };
      const spy = jest.spyOn(redisConfig, 'getRedisClient').mockReturnValue(mockRedis as any);

      const req: any = { headers: { authorization: `Bearer ${mockKey}` } };
      const res = createMockRes();
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid or expired credentials',
      });

      spy.mockRestore();
    });
  });

  describe('MCP Agent Keys & authenticateAgentKey', () => {
    it('active company + active key = success in McpAgentKeyService.authenticateAgentKey', async () => {
      const agent = await McpAgentKeyService.authenticateAgentKey(activeMcpKeyRaw);

      expect(agent).toBeDefined();
      expect(agent.organizationId).toBe(ACTIVE_ORG_ID);
      expect(agent.agentKeyId).toBeDefined();
      expect(Array.isArray(agent.allowedTools)).toBe(true);
    });

    it('deactivated company + active key = rejects with Unauthorized in McpAgentKeyService.authenticateAgentKey', async () => {
      await expect(
        McpAgentKeyService.authenticateAgentKey(deactivatedOrgMcpKeyRaw)
      ).rejects.toThrow('Unauthorized');
    });

    it('active company + inactive key = rejects with Unauthorized in McpAgentKeyService.authenticateAgentKey', async () => {
      await expect(
        McpAgentKeyService.authenticateAgentKey(inactiveMcpKeyRaw)
      ).rejects.toThrow('Unauthorized');
    });

    it('active company + active key = HTTP 200 in McpController (tools/list)', async () => {
      const req: any = {
        body: { jsonrpc: '2.0', id: 'mcp-test-1', method: 'tools/list' },
        headers: { authorization: `Bearer ${activeMcpKeyRaw}` },
      };
      const res = createMockRes();

      await McpController.handleJsonRpc(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.body.result).toBeDefined();
      expect(Array.isArray(res.body.result.tools)).toBe(true);
    });

    it('deactivated company + active key = HTTP 401 in McpController (tools/list)', async () => {
      const req: any = {
        body: { jsonrpc: '2.0', id: 'mcp-test-2', method: 'tools/list' },
        headers: { authorization: `Bearer ${deactivatedOrgMcpKeyRaw}` },
      };
      const res = createMockRes();

      await McpController.handleJsonRpc(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.body).toEqual({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Unauthorized: Missing or invalid agent key',
        },
        id: 'mcp-test-2',
      });
    });

    it('active company + inactive key = HTTP 401 in McpController (tools/list)', async () => {
      const req: any = {
        body: { jsonrpc: '2.0', id: 'mcp-test-3', method: 'tools/list' },
        headers: { authorization: `Bearer ${inactiveMcpKeyRaw}` },
      };
      const res = createMockRes();

      await McpController.handleJsonRpc(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.body.error.message).toBe('Unauthorized: Missing or invalid agent key');
    });
  });

  describe('LLM Keys skipping deactivated companies', () => {
    it('LLMKeysService.getKeys returns keys for active company', async () => {
      const keys = await LLMKeysService.getKeys(ACTIVE_ORG_ID);
      expect(keys.length).toBeGreaterThanOrEqual(1);
      expect(keys.some((k) => k.provider === 'openai')).toBe(true);
    });

    it('LLMKeysService.getKeys skips keys for deactivated company (returns empty)', async () => {
      const keys = await LLMKeysService.getKeys(DEACTIVATED_ORG_ID);
      expect(keys).toEqual([]);
    });

    it('AgentDiscoveryService.discoverAgents skips LLM keys and MCP keys for deactivated company', async () => {
      const discovered = await AgentDiscoveryService.discoverAgents(DEACTIVATED_ORG_ID);
      const llmCandidates = discovered.filter((c) => c.type === 'LLM_API');
      const mcpCandidates = discovered.filter((c) => c.type === 'MCP_AGENT');

      expect(llmCandidates).toEqual([]);
      expect(mcpCandidates).toEqual([]);
    });

    it('AttackGraphService.buildGraph skips LLM keys and MCP keys for deactivated company', async () => {
      const graph = await AttackGraphService.buildGraph(DEACTIVATED_ORG_ID);
      const llmNodes = graph.nodes.filter((n) => n.type === 'LLM_KEY');
      const mcpEdges = graph.edges.filter((e) => e.target.startsWith('mcp-') || e.source.startsWith('mcp-'));

      expect(llmNodes).toEqual([]);
      expect(mcpEdges).toEqual([]);
    });
  });
});

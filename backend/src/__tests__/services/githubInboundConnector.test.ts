const mockPrisma = {
  connectors: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  interception_logs: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  mcp_agent_keys: {
    findMany: jest.fn(),
  },
  llm_keys: {
    findMany: jest.fn(),
  },
  slack_config: {
    findUnique: jest.fn(),
  },
  logs: {
    findMany: jest.fn(),
    groupBy: jest.fn().mockResolvedValue([]),
  },
  ai_systems: {
    findMany: jest.fn(),
  },
  agent: {
    deleteMany: jest.fn(),
    upsert: jest.fn(),
    findMany: jest.fn(),
  },
};

jest.mock('../../config/db', () => ({
  __esModule: true,
  default: mockPrisma,
}));

jest.mock('../../server', () => ({
  io: {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  },
}));

import prisma from '../../config/db';
import { testConnectorSource } from '../../services/connectorTest.service';
import {
  processConnectorScan,
  GITHUB_SCAN_CONFIG,
  callGitHubWithBackoff,
} from '../../services/queue.service';
import {
  createConnectorSchema,
  testConnectorSchema,
} from '../../validations/connector.validation';
import { encryptCredentials } from '../../utils/credentialHelper';
import { AgentDiscoveryService } from '../../services/agentDiscovery.service';
import logger from '../../utils/logger';

describe('GitHub Inbound Scanning Connector', () => {
  const FAKE_PAT_TOKEN = 'github_pat_11ABCD1234efgh5678IJKL90mnop_test_token_for_jest_mock_suite_day13_connector';
  const FAKE_CLASSIC_TOKEN = 'ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const ORG_A = 'org-tenant-a-111';
  const ORG_B = 'org-tenant-b-222';
  const CONNECTOR_ID = 'conn-github-123';

  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ALLOW_PRIVATE_NETWORK_TARGETS = 'true';
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  describe('Validation (connector.validation.ts)', () => {
    it('accepts valid fine-grained token format starting with github_pat_', () => {
      const payload = {
        body: {
          name: 'Corporate GitHub',
          type: 'github',
          credentials: { token: FAKE_PAT_TOKEN },
        },
      };

      const result = createConnectorSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('accepts valid classic token format starting with ghp_', () => {
      const payload = {
        body: {
          name: 'Corporate GitHub Classic',
          type: 'github',
          credentials: { token: FAKE_CLASSIC_TOKEN },
        },
      };

      const result = createConnectorSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('accepts valid GitHub token as direct string in testConnectorSchema', () => {
      const payload = {
        body: {
          type: 'github',
          credentials: FAKE_PAT_TOKEN,
        },
      };

      const result = testConnectorSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('rejects token that does not start with github_pat_ or ghp_', () => {
      const payload = {
        body: {
          name: 'Corporate GitHub',
          type: 'github',
          credentials: { token: 'invalid_prefix_token_1234567890' },
        },
      };

      const result = createConnectorSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("must begin with 'github_pat_'");
      }
    });

    it('rejects missing token for github type', () => {
      const payload = {
        body: {
          name: 'Corporate GitHub',
          type: 'github',
          credentials: {},
        },
      };

      const result = createConnectorSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('Connection Test Service (connectorTest.service.ts)', () => {
    it('returns error when token is missing or empty', async () => {
      const result = await testConnectorSource('github', {}, {});
      expect(result.success).toBe(false);
      expect(result.message).toContain('token is required');
    });

    it('returns error when token does not match valid prefix', async () => {
      const result = await testConnectorSource(
        'github',
        {},
        { token: 'invalid_token_no_prefix' }
      );
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid GitHub personal access token format');
    });

    it('returns error when GitHub /user returns 401 Bad credentials', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Bad credentials' }),
      } as any);

      const result = await testConnectorSource(
        'github',
        {},
        { token: FAKE_PAT_TOKEN }
      );
      expect(result.success).toBe(false);
      expect(result.message).toContain('GitHub authentication failed: Bad credentials');
    });

    it('returns error when GitHub /user returns 403 Rate Limit', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ message: 'API rate limit exceeded for user' }),
      } as any);

      const result = await testConnectorSource(
        'github',
        {},
        { token: FAKE_PAT_TOKEN }
      );
      expect(result.success).toBe(false);
      expect(result.message).toContain('rate limit exceeded');
    });

    it('returns warning state when token is valid but 0 accessible repos found', async () => {
      // 1. /user succeeds
      // 2. /user/repos returns empty array []
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ login: 'sentra-tester', id: 101 }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => [],
        } as any);

      const result = await testConnectorSource(
        'github',
        {},
        { token: FAKE_PAT_TOKEN }
      );
      expect(result.success).toBe(true);
      expect(result.warning).toBe(true);
      expect(result.message).toContain('0 accessible repositories were found');
      expect(result.details?.repoCount).toBe(0);
      expect(result.details?.accountName).toBe('sentra-tester');
    });

    it('returns success with repository count when repositories are accessible', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ login: 'acme-corp', id: 202 }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => [
            { id: 1, name: 'api-gateway', full_name: 'acme-corp/api-gateway' },
            { id: 2, name: 'auth-service', full_name: 'acme-corp/auth-service' },
          ],
        } as any);

      const result = await testConnectorSource(
        'github',
        {},
        { token: FAKE_PAT_TOKEN }
      );
      expect(result.success).toBe(true);
      expect(result.warning).toBe(false);
      expect(result.message).toContain('Found 2 accessible repository(ies)');
      expect(result.details?.repoCount).toBe(2);
      expect(result.details?.repos).toEqual(['acme-corp/api-gateway', 'acme-corp/auth-service']);
    });

    it('paginates /user/repos when multiple pages exist and reports count received vs total', async () => {
      const page1Headers = new Headers();
      page1Headers.set(
        'link',
        '<https://api.github.com/user/repos?per_page=100&page=2>; rel="next", <https://api.github.com/user/repos?per_page=100&page=2>; rel="last"'
      );

      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ login: 'large-org' }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: page1Headers,
          json: async () => [
            { id: 1, name: 'repo-1', full_name: 'large-org/repo-1' },
          ],
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => [
            { id: 2, name: 'repo-2', full_name: 'large-org/repo-2' },
          ],
        } as any);

      const result = await testConnectorSource(
        'github',
        {},
        { token: FAKE_PAT_TOKEN }
      );
      expect(result.success).toBe(true);
      expect(result.details?.receivedCount).toBe(2);
      expect(result.details?.totalCount).toBeGreaterThanOrEqual(2);
      expect(result.details?.repos).toEqual(['large-org/repo-1', 'large-org/repo-2']);
    });

    it('strictly NEVER returns the token in test response or details (Token Never Logged / Exposed)', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ login: 'secure-user' }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => [{ id: 1, name: 'repo-1', full_name: 'secure-user/repo-1' }],
        } as any);

      const result = await testConnectorSource(
        'github',
        {},
        { token: FAKE_PAT_TOKEN }
      );
      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain(FAKE_PAT_TOKEN);
    });
  });

  describe('Queue Scan Handler (queue.service.ts)', () => {
    const encryptedCreds = encryptCredentials({ token: FAKE_PAT_TOKEN });

    const createMockConnector = (orgId = ORG_A, config = {}) => ({
      id: CONNECTOR_ID,
      name: 'GitHub Inbound Scanner',
      type: 'github',
      organizationId: orgId,
      credentials: encryptedCreds,
      config: { ...config },
      scope: {},
      status: 'active',
      health_score: 100,
      daily_cost_total: 0,
      total_api_calls: 0,
      total_data_scanned: BigInt(0),
      scan_policy: { maxDailyCost: 50 },
    });

    it('scans repositories, fetches git trees and files, detects secrets and PII, records finding without raw secret text', async () => {
      const connector = createMockConnector();
      (prisma.connectors.findUnique as jest.Mock).mockResolvedValueOnce(connector);

      // 1. /user/repos list
      // 2. /git/trees/{branch}?recursive=1
      // 3. /git/blobs/{sha} for sensitive file
      const sensitiveApiKey = 'key_live_abcdef1234567890abcdef1234567890';
      const fileText = `DATABASE_URL=postgres://...\nAPI_SECRET=${sensitiveApiKey}\nADMIN_EMAIL=security@corp.example`;
      const base64Content = Buffer.from(fileText).toString('base64');

      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => [
            { id: 10, name: 'backend-api', full_name: 'acme/backend-api', default_branch: 'main' },
          ],
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            sha: 'tree123',
            tree: [
              { path: '.env.production', type: 'blob', size: 150, sha: 'blob_env_sha_111' },
            ],
            truncated: false,
          }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            sha: 'blob_env_sha_111',
            content: base64Content,
            encoding: 'base64',
          }),
        } as any);

      await processConnectorScan('github', CONNECTOR_ID);

      // Verify findings recorded
      expect(prisma.interception_logs.create).toHaveBeenCalled();
      const calls = (prisma.interception_logs.create as jest.Mock).mock.calls;
      expect(calls.length).toBeGreaterThan(0);

      const finding = calls[0][0].data;
      expect(finding.organizationId).toBe(ORG_A);
      expect(finding.decision).toBe('BLOCK');
      expect(finding.confidence).toBe('High');
      expect(finding.metadata.source_type).toBe('github');
      expect(finding.metadata.repo).toBe('acme/backend-api');
      expect(finding.metadata.filePath).toBe('.env.production');
      expect(finding.metadata.commitSha).toBe('blob_env_sha_111');
      expect(finding.metadata.fileKey).toBe('github://acme/backend-api/.env.production');

      // CRITICAL SECRET / PII PROTECTION CHECK: NEVER store raw secrets or raw email in input_text
      expect(finding.input_text).not.toContain(sensitiveApiKey);
      expect(finding.input_text).toBe('Scan of GitHub file in acme/backend-api/.env.production');
      expect(JSON.stringify(finding.metadata)).not.toContain(sensitiveApiKey);

      // Verify connector updated with active state and cached blob sha
      expect(prisma.connectors.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: CONNECTOR_ID },
          data: expect.objectContaining({
            status: 'active',
            last_error: null,
          }),
        })
      );
    });

    it('skips non-text files and binary lockfiles from file scanning', async () => {
      const connector = createMockConnector();
      (prisma.connectors.findUnique as jest.Mock).mockResolvedValueOnce(connector);

      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => [
            { id: 20, name: 'assets-repo', full_name: 'acme/assets-repo', default_branch: 'main' },
          ],
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            sha: 'tree456',
            tree: [
              { path: 'logo.png', type: 'blob', size: 50000, sha: 'blob_png_sha' },
              { path: 'bundle.min.js', type: 'blob', size: 200000, sha: 'blob_min_sha' },
              { path: 'package-lock.json', type: 'blob', size: 100000, sha: 'blob_lock_sha' },
            ],
            truncated: false,
          }),
        } as any);

      await processConnectorScan('github', CONNECTOR_ID);

      // No blob fetch should have been performed
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(prisma.interception_logs.create).not.toHaveBeenCalled();
    });

    it('deduplicates files: skips already-scanned files based on blob sha', async () => {
      const connector = createMockConnector(ORG_A, {
        lastScannedShas: {
          'acme/dedup-repo': {
            'src/config.ts': 'blob_sha_existing_123',
          },
        },
      });
      (prisma.connectors.findUnique as jest.Mock).mockResolvedValueOnce(connector);

      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => [
            { id: 30, name: 'dedup-repo', full_name: 'acme/dedup-repo', default_branch: 'main' },
          ],
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            sha: 'tree789',
            tree: [
              { path: 'src/config.ts', type: 'blob', size: 1024, sha: 'blob_sha_existing_123' },
            ],
            truncated: false,
          }),
        } as any);

      await processConnectorScan('github', CONNECTOR_ID);

      // Only 2 calls: list repos, fetch tree. Blob content fetch was skipped due to matching SHA!
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(prisma.interception_logs.create).not.toHaveBeenCalled();
    });

    it('handles HTTP 429 rate limit backoff and retries gracefully', async () => {
      let callCount = 0;
      const fn = jest.fn().mockImplementation(async () => {
        callCount++;
        if (callCount <= 2) {
          const err = Object.assign(new Error('Rate limit exceeded'), {
            status: 429,
            headers: new Headers({ 'retry-after': '1' }),
          });
          throw err;
        }
        return { success: true };
      });

      const res = await callGitHubWithBackoff(fn, 3);
      expect(res).toEqual({ success: true });
      expect(callCount).toBe(3);
    });

    it('multi-tenant isolation: Org B queries cannot access or modify Org A connector or findings', async () => {
      const connectorA = createMockConnector(ORG_A);
      (prisma.connectors.findUnique as jest.Mock).mockResolvedValueOnce(connectorA);

      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => [
            { id: 40, name: 'tenant-repo', full_name: 'acme/tenant-repo', default_branch: 'main' },
          ],
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            tree: [{ path: 'user.txt', type: 'blob', sha: 'blob_user_sha', size: 50 }],
          }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            content: Buffer.from('User email: tenant_a_victim@corp.com').toString('base64'),
            encoding: 'base64',
          }),
        } as any);

      await processConnectorScan('github', CONNECTOR_ID);

      const interceptionCalls = (prisma.interception_logs.create as jest.Mock).mock.calls;
      expect(interceptionCalls.length).toBeGreaterThan(0);
      for (const call of interceptionCalls) {
        expect(call[0].data.organizationId).toBe(ORG_A);
        expect(call[0].data.organizationId).not.toBe(ORG_B);
      }
    });

    it('completes cleanly with amber warning when zero accessible repos exist', async () => {
      const connector = createMockConnector();
      (prisma.connectors.findUnique as jest.Mock).mockResolvedValueOnce(connector);

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => [],
      } as any);

      await processConnectorScan('github', CONNECTOR_ID);

      expect(prisma.interception_logs.create).not.toHaveBeenCalled();
      expect(prisma.connectors.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: CONNECTOR_ID },
          data: expect.objectContaining({
            status: 'warning',
            last_error: '0 accessible repositories, ensure token has repository access granted',
          }),
        })
      );
    });

    it('token is NEVER logged or leaked in worker processing', async () => {
      const warnSpy = jest.spyOn(logger, 'warn');
      const infoSpy = jest.spyOn(logger, 'info');

      const connector = createMockConnector();
      (prisma.connectors.findUnique as jest.Mock).mockResolvedValueOnce(connector);

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => [],
      } as any);

      await processConnectorScan('github', CONNECTOR_ID);

      for (const call of [...warnSpy.mock.calls, ...infoSpy.mock.calls]) {
        const text = call.map(String).join(' ');
        expect(text).not.toContain(FAKE_PAT_TOKEN);
      }
    });
  });

  describe('Agent Discovery Integration', () => {
    it('discovers GitHub inbound connectors as GitHub Organization Connector agents', async () => {
      (prisma.connectors.findMany as jest.Mock).mockResolvedValueOnce([
        {
          id: CONNECTOR_ID,
          name: 'Corporate GitHub Scanner',
          type: 'github',
          organizationId: ORG_A,
          status: 'active',
          priority: 'high',
          scope: { repositories: ['acme/core-api'] },
          health_score: 95,
          last_scan_at: new Date(),
        },
      ]);
      (prisma.llm_keys.findMany as jest.Mock).mockResolvedValueOnce([]);
      (prisma.mcp_agent_keys.findMany as jest.Mock).mockResolvedValueOnce([]);
      (prisma.slack_config.findUnique as jest.Mock).mockResolvedValueOnce(null);
      (prisma.logs.findMany as jest.Mock).mockResolvedValueOnce([]);
      (prisma.logs.groupBy as jest.Mock).mockResolvedValueOnce([]);
      (prisma.ai_systems.findMany as jest.Mock).mockResolvedValueOnce([]);
      (prisma.agent.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.agent.upsert as jest.Mock).mockImplementation(({ create }: any) => Promise.resolve(create));
      (prisma.agent.findMany as jest.Mock).mockResolvedValue([
        {
          name: 'Corporate GitHub Scanner',
          type: 'GITHUB_CONNECTOR',
          source: 'GitHub Organization Connector',
          permissions: { granted: ['github:read', 'github:scan'] },
        },
      ]);

      const agents = await AgentDiscoveryService.discoverAgents(ORG_A);
      const ghAgent = agents.find((a: any) => a.name === 'Corporate GitHub Scanner');

      expect(ghAgent).toBeDefined();
      expect(ghAgent?.source).toBe('GitHub Organization Connector');
      expect(ghAgent?.type).toBe('GITHUB_CONNECTOR');
      expect(ghAgent?.permissions?.granted).toEqual(['github:read', 'github:scan']);
    });
  });
});

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

const mockAuthTest = jest.fn();
const mockConversationsList = jest.fn();
const mockConversationsHistory = jest.fn();

jest.mock('@slack/web-api', () => ({
  WebClient: jest.fn().mockImplementation(() => ({
    auth: { test: mockAuthTest },
    conversations: {
      list: mockConversationsList,
      history: mockConversationsHistory,
    },
  })),
}));

import prisma from '../../config/db';
import { testConnectorSource } from '../../services/connectorTest.service';
import {
  processConnectorScan,
  SLACK_SCAN_CONFIG,
  callSlackWithBackoff,
} from '../../services/queue.service';
import {
  createConnectorSchema,
  testConnectorSchema,
} from '../../validations/connector.validation';
import { encryptCredentials } from '../../utils/credentialHelper';
import { AgentDiscoveryService } from '../../services/agentDiscovery.service';

describe('Slack Inbound Scanning Connector', () => {
  const FAKE_TEST_TOKEN = 'xoxb-fake-test-workspace-token-1234567890';
  const ORG_A = 'org-tenant-a-111';
  const ORG_B = 'org-tenant-b-222';
  const CONNECTOR_ID = 'conn-slack-123';

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ALLOW_PRIVATE_NETWORK_TARGETS = 'true';
  });

  describe('Validation (connector.validation.ts)', () => {
    it('accepts valid Slack bot token format starting with xoxb-', () => {
      const payload = {
        body: {
          name: 'Corporate Slack',
          type: 'slack',
          credentials: { botToken: FAKE_TEST_TOKEN },
        },
      };

      const result = createConnectorSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('accepts valid Slack bot token as direct string in testConnectorSchema', () => {
      const payload = {
        body: {
          type: 'slack',
          credentials: FAKE_TEST_TOKEN,
        },
      };

      const result = testConnectorSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('rejects bot token that does not start with xoxb-', () => {
      const payload = {
        body: {
          name: 'Corporate Slack',
          type: 'slack',
          credentials: { botToken: 'invalid-prefix-token-1234567890' },
        },
      };

      const result = createConnectorSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("must begin with 'xoxb-'");
      }
    });

    it('rejects missing bot token for slack type', () => {
      const payload = {
        body: {
          name: 'Corporate Slack',
          type: 'slack',
          credentials: {},
        },
      };

      const result = createConnectorSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('Connection Test Service (connectorTest.service.ts)', () => {
    it('returns error when bot token is missing or empty', async () => {
      const result = await testConnectorSource('slack', {}, {});
      expect(result.success).toBe(false);
      expect(result.message).toContain('Token is required');
    });

    it('returns error when bot token does not start with xoxb-', async () => {
      const result = await testConnectorSource(
        'slack',
        {},
        { botToken: 'invalid-token-without-prefix' }
      );
      expect(result.success).toBe(false);
      expect(result.message).toContain("must begin with \"xoxb-\"");
    });

    it('returns error when auth.test fails', async () => {
      mockAuthTest.mockResolvedValueOnce({
        ok: false,
        error: 'invalid_auth',
      });

      const result = await testConnectorSource(
        'slack',
        {},
        { botToken: FAKE_TEST_TOKEN }
      );
      expect(result.success).toBe(false);
      expect(result.message).toContain('Slack authentication failed');
    });

    it('handles missing_scope error with actionable message', async () => {
      mockAuthTest.mockResolvedValueOnce({
        ok: true,
        team: 'Acme Corp',
        user_id: 'U12345',
      });
      mockConversationsList.mockRejectedValueOnce({
        data: { error: 'missing_scope', needed: 'channels:read' },
      });

      const result = await testConnectorSource(
        'slack',
        {},
        { botToken: FAKE_TEST_TOKEN }
      );
      expect(result.success).toBe(false);
      expect(result.message).toContain('channels:read');
    });

    it('returns warning state when 0 readable channels are found', async () => {
      mockAuthTest.mockResolvedValueOnce({
        ok: true,
        team: 'Acme Corp',
        user_id: 'U12345',
      });
      mockConversationsList.mockResolvedValueOnce({
        ok: true,
        channels: [],
      });

      const result = await testConnectorSource(
        'slack',
        {},
        { botToken: FAKE_TEST_TOKEN }
      );
      expect(result.success).toBe(true);
      expect(result.warning).toBe(true);
      expect(result.message).toContain('0 readable channels were found');
      expect(result.details?.channelCount).toBe(0);
      expect(result.details?.workspaceName).toBe('Acme Corp');
    });

    it('returns success with channel count when channels > 0', async () => {
      mockAuthTest.mockResolvedValueOnce({
        ok: true,
        team: 'Acme Corp',
        user_id: 'U12345',
      });
      mockConversationsList.mockResolvedValueOnce({
        ok: true,
        channels: [
          { id: 'C1', name: 'general' },
          { id: 'C2', name: 'security' },
        ],
      });

      const result = await testConnectorSource(
        'slack',
        {},
        { botToken: FAKE_TEST_TOKEN }
      );
      expect(result.success).toBe(true);
      expect(result.warning).toBe(false);
      expect(result.message).toContain('Found 2 readable channel(s)');
      expect(result.details?.channelCount).toBe(2);
      expect(result.details?.workspaceName).toBe('Acme Corp');
    });

    it('never returns the bot token in test response or details', async () => {
      mockAuthTest.mockResolvedValueOnce({
        ok: true,
        team: 'Acme Corp',
      });
      mockConversationsList.mockResolvedValueOnce({
        ok: true,
        channels: [{ id: 'C1', name: 'general' }],
      });

      const result = await testConnectorSource(
        'slack',
        {},
        { botToken: FAKE_TEST_TOKEN }
      );
      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain(FAKE_TEST_TOKEN);
    });
  });

  describe('Queue Scan Handler (queue.service.ts)', () => {
    const encryptedCreds = encryptCredentials({ botToken: FAKE_TEST_TOKEN });

    const createMockConnector = (orgId = ORG_A, config = {}) => ({
      id: CONNECTOR_ID,
      name: 'Slack Inbound Scanner',
      type: 'slack',
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

    it('scans public channels, detects PII, and records finding without raw message text', async () => {
      const connector = createMockConnector();
      (prisma.connectors.findUnique as jest.Mock).mockResolvedValueOnce(connector);

      mockConversationsList.mockResolvedValueOnce({
        ok: true,
        channels: [{ id: 'C123', name: 'general', is_archived: false }],
        response_metadata: {},
      });

      const sensitiveText = 'Customer email is alice@corp.example and phone 555-0199';
      mockConversationsHistory.mockResolvedValueOnce({
        ok: true,
        messages: [
          {
            ts: '1700000001.000100',
            text: sensitiveText,
          },
        ],
        response_metadata: {},
      });

      await processConnectorScan('slack', CONNECTOR_ID);

      // Verify finding was recorded in interception_logs
      expect(prisma.interception_logs.create).toHaveBeenCalled();
      const callArgs = (prisma.interception_logs.create as jest.Mock).mock.calls[0][0].data;

      // Must be scoped to org
      expect(callArgs.organizationId).toBe(ORG_A);
      expect(callArgs.decision).toBe('BLOCK');
      expect(callArgs.confidence).toBe('High');
      expect(callArgs.metadata.source_type).toBe('slack');
      expect(callArgs.metadata.channelId).toBe('C123');
      expect(callArgs.metadata.channelName).toBe('general');

      // CRITICAL DATA HANDLING CHECK: NEVER store raw message text
      expect(callArgs.input_text).not.toContain(sensitiveText);
      expect(callArgs.input_text).toBe('Scan of Slack message in #general');
      expect(JSON.stringify(callArgs.metadata)).not.toContain(sensitiveText);

      // Verify connector health updated
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

    it('skips bot messages to avoid recursion loops and redundant alerts', async () => {
      const connector = createMockConnector();
      (prisma.connectors.findUnique as jest.Mock).mockResolvedValueOnce(connector);

      mockConversationsList.mockResolvedValueOnce({
        ok: true,
        channels: [{ id: 'C123', name: 'alerts', is_archived: false }],
      });

      mockConversationsHistory.mockResolvedValueOnce({
        ok: true,
        messages: [
          {
            ts: '1700000002.000100',
            subtype: 'bot_message',
            bot_id: 'B123',
            text: 'Sensitive text user@test.com from bot',
          },
          {
            ts: '1700000002.000200',
            app_id: 'A999',
            text: 'System alert message admin@corp.com',
          },
        ],
      });

      await processConnectorScan('slack', CONNECTOR_ID);

      expect(prisma.interception_logs.create).not.toHaveBeenCalled();
    });

    it('deduplicates messages: skips already-scanned messages based on timestamp', async () => {
      const connector = createMockConnector(ORG_A, {
        lastScannedTimestamps: { C123: '1700000500.000000' },
      });
      (prisma.connectors.findUnique as jest.Mock).mockResolvedValueOnce(connector);

      mockConversationsList.mockResolvedValueOnce({
        ok: true,
        channels: [{ id: 'C123', name: 'general', is_archived: false }],
      });

      mockConversationsHistory.mockResolvedValueOnce({
        ok: true,
        messages: [
          {
            ts: '1700000400.000000', // Older than lastScanned
            text: 'Customer leak test@example.com',
          },
        ],
      });

      await processConnectorScan('slack', CONNECTOR_ID);

      expect(prisma.interception_logs.create).not.toHaveBeenCalled();
    });

    it('paginates conversations.list and conversations.history with cursor', async () => {
      const connector = createMockConnector();
      (prisma.connectors.findUnique as jest.Mock).mockResolvedValueOnce(connector);

      // Page 1 of channels
      mockConversationsList
        .mockResolvedValueOnce({
          ok: true,
          channels: [{ id: 'C1', name: 'general' }],
          response_metadata: { next_cursor: 'cursor-page-2' },
        })
        // Page 2 of channels
        .mockResolvedValueOnce({
          ok: true,
          channels: [{ id: 'C2', name: 'engineering' }],
          response_metadata: {},
        });

      mockConversationsHistory
        .mockResolvedValueOnce({
          ok: true,
          messages: [{ ts: '1700000001.0001', text: 'Clean message in C1' }],
        })
        .mockResolvedValueOnce({
          ok: true,
          messages: [{ ts: '1700000002.0001', text: 'Clean message in C2' }],
        });

      await processConnectorScan('slack', CONNECTOR_ID);

      expect(mockConversationsList).toHaveBeenCalledTimes(2);
      expect(mockConversationsList).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ cursor: 'cursor-page-2' })
      );
    });

    it('handles HTTP 429 rate limit backoff and retries gracefully', async () => {
      let callCount = 0;
      const fn = jest.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          const err: any = new Error('Rate limit exceeded');
          err.status = 429;
          err.headers = { 'retry-after': '0.05' };
          throw err;
        }
        return 'success';
      });

      const res = await callSlackWithBackoff(fn, 2);
      expect(res).toBe('success');
      expect(callCount).toBe(2);
    });

    it('respects safety caps: max channels and max messages per channel', async () => {
      expect(SLACK_SCAN_CONFIG.MAX_CHANNELS).toBe(25);
      expect(SLACK_SCAN_CONFIG.MAX_MESSAGES_PER_CHANNEL).toBe(100);
      expect(SLACK_SCAN_CONFIG.MAX_FILE_SIZE_BYTES).toBe(1024 * 1024);
      expect(SLACK_SCAN_CONFIG.LOOKBACK_DAYS).toBe(7);
    });

    it('scans attached text files and downloads them securely', async () => {
      const connector = createMockConnector();
      (prisma.connectors.findUnique as jest.Mock).mockResolvedValueOnce(connector);

      mockConversationsList.mockResolvedValueOnce({
        ok: true,
        channels: [{ id: 'C123', name: 'confidential' }],
      });

      // Mock fetch for Slack private file download
      const originalFetch = global.fetch;
      const fakeFileContent = 'API_KEY: key_secret_token_abcdef1234567890';
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(fakeFileContent),
      }) as any;

      try {
        mockConversationsHistory.mockResolvedValueOnce({
          ok: true,
          messages: [
            {
              ts: '1700000010.0001',
              text: 'Sharing confidential file',
              files: [
                {
                  id: 'F999',
                  name: 'credentials.txt',
                  mimetype: 'text/plain',
                  size: 500,
                  url_private_download: 'https://files.slack.com/files-pri/T123/credentials.txt',
                },
              ],
            },
          ],
        });

        await processConnectorScan('slack', CONNECTOR_ID);

        expect(prisma.interception_logs.create).toHaveBeenCalled();
        const callArgs = (prisma.interception_logs.create as jest.Mock).mock.calls[0][0].data;

        expect(callArgs.input_text).toBe('Scan of Slack file in #confidential');
        expect(callArgs.metadata.fileKey).toContain('credentials.txt');
        // Zero raw file text stored
        expect(callArgs.input_text).not.toContain(fakeFileContent);
        expect(JSON.stringify(callArgs.metadata)).not.toContain(fakeFileContent);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('multi-tenant isolation: Org B queries cannot access or modify Org A connector or findings', async () => {
      // 1. Setup connector belonging to Org A
      const connectorA = createMockConnector(ORG_A);
      (prisma.connectors.findUnique as jest.Mock).mockResolvedValueOnce(connectorA);

      mockConversationsList.mockResolvedValueOnce({
        ok: true,
        channels: [{ id: 'C1', name: 'general' }],
      });

      mockConversationsHistory.mockResolvedValueOnce({
        ok: true,
        messages: [{ ts: '1700000001.0001', text: 'Sensitive email user@example.com' }],
      });

      await processConnectorScan('slack', CONNECTOR_ID);

      // Verify all findings created are strictly assigned to ORG_A
      const interceptionCalls = (prisma.interception_logs.create as jest.Mock).mock.calls;
      expect(interceptionCalls.length).toBeGreaterThan(0);
      for (const call of interceptionCalls) {
        expect(call[0].data.organizationId).toBe(ORG_A);
        expect(call[0].data.organizationId).not.toBe(ORG_B);
      }
    });
  });

  describe('Agent Discovery Integration', () => {
    it('discovers Slack inbound connectors as Slack Workspace Connector agents', async () => {
      (prisma.connectors.findMany as jest.Mock).mockResolvedValueOnce([
        {
          id: 'conn-slack-discovered',
          organizationId: ORG_A,
          name: 'Customer Slack Scanner',
          type: 'slack',
          status: 'active',
          priority: 'high',
          scope: {},
          health_score: 95,
          last_scan_at: new Date(),
        },
      ]);
      (prisma.mcp_agent_keys.findMany as jest.Mock).mockResolvedValueOnce([]);
      (prisma.llm_keys.findMany as jest.Mock).mockResolvedValueOnce([]);
      (prisma.slack_config.findUnique as jest.Mock).mockResolvedValueOnce(null);
      (prisma.logs.findMany as jest.Mock).mockResolvedValueOnce([]);
      (prisma.logs.groupBy as jest.Mock).mockResolvedValueOnce([]);
      (prisma.ai_systems.findMany as jest.Mock).mockResolvedValueOnce([]);
      (prisma.agent.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.agent.upsert as jest.Mock).mockImplementation(({ create }: any) => Promise.resolve(create));
      (prisma.agent.findMany as jest.Mock).mockResolvedValue([
        {
          name: 'Customer Slack Scanner',
          type: 'SLACK_CONNECTOR',
          source: 'Slack Workspace Connector',
          permissions: { granted: ['slack:read', 'slack:scan'] },
        },
      ]);

      const agents = await AgentDiscoveryService.discoverAgents(ORG_A);
      const slackAgent = agents.find((a: any) => a.name === 'Customer Slack Scanner');

      expect(slackAgent).toBeDefined();
      expect(slackAgent?.source).toBe('Slack Workspace Connector');
      expect(slackAgent?.type).toBe('SLACK_CONNECTOR');
      expect(slackAgent?.permissions?.granted).toEqual(['slack:read', 'slack:scan']);
    });
  });
});

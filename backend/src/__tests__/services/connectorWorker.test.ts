let capturedProcessor: ((job: any) => Promise<any>) | null = null;
const mockWorkerInstances: any[] = [];

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'job-id' }),
    close: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    getRepeatableJobs: jest.fn().mockResolvedValue([]),
    removeRepeatableByKey: jest.fn().mockResolvedValue(true),
  })),
  Worker: jest.fn().mockImplementation((queueName: string, processor: any, opts: any) => {
    capturedProcessor = processor;
    const instance = {
      queueName,
      processor,
      opts,
      on: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };
    mockWorkerInstances.push(instance);
    return instance;
  }),
}));

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    quit: jest.fn().mockResolvedValue('OK'),
  }));
});

const mockConnectorsFindUnique = jest.fn();
const mockConnectorsUpdate = jest.fn();
const mockInterceptionLogsCreate = jest.fn();

jest.mock('../../config/db', () => ({
  __esModule: true,
  default: {
    connectors: {
      findUnique: (...args: any[]) => mockConnectorsFindUnique(...args),
      update: (...args: any[]) => mockConnectorsUpdate(...args),
      findMany: jest.fn().mockResolvedValue([]),
    },
    interception_logs: {
      create: (...args: any[]) => mockInterceptionLogsCreate(...args),
    },
  },
}));

jest.mock('../../config/redis', () => ({
  getRedisUrl: jest.fn().mockReturnValue('redis://localhost:6379'),
  buildRedisOptions: jest.fn().mockReturnValue({}),
  getRedisConnection: jest.fn().mockReturnValue({}),
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Mock S3
const mockS3Send = jest.fn();
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: mockS3Send,
  })),
  ListObjectsV2Command: jest.fn().mockImplementation((args) => args),
  GetObjectCommand: jest.fn().mockImplementation((args) => args),
}));

// Mock Google Drive
const mockDriveFilesList = jest.fn();
const mockDriveFilesGet = jest.fn();
jest.mock('googleapis', () => ({
  google: {
    drive: jest.fn().mockReturnValue({
      files: {
        list: (...args: any[]) => mockDriveFilesList(...args),
        get: (...args: any[]) => mockDriveFilesGet(...args),
      },
    }),
    auth: {
      JWT: jest.fn().mockImplementation(() => ({
        authorize: jest.fn().mockResolvedValue(true),
      })),
    },
  },
}));

// Mock pg
const mockPgConnect = jest.fn();
const mockPgQuery = jest.fn();
const mockPgEnd = jest.fn();
jest.mock('pg', () => ({
  Client: jest.fn().mockImplementation(() => ({
    connect: mockPgConnect,
    query: mockPgQuery,
    end: mockPgEnd,
  })),
}));

// Mock Slack
const mockSlackConversationsList = jest.fn();
const mockSlackConversationsHistory = jest.fn();
jest.mock('@slack/web-api', () => ({
  WebClient: jest.fn().mockImplementation(() => ({
    conversations: {
      list: mockSlackConversationsList,
      history: mockSlackConversationsHistory,
    },
  })),
}));

// Mock decryptCredentials
jest.mock('../../utils/credentialHelper', () => ({
  decryptCredentials: jest.fn().mockImplementation((creds) => {
    if (typeof creds === 'object') return creds;
    try {
      return JSON.parse(creds);
    } catch {
      return { token: creds };
    }
  }),
  normalizePrivateKey: jest.fn((k) => k),
  encryptCredentials: jest.fn((c) => JSON.stringify(c)),
}));

import { setupConnectorWorkers, resetConnectorWorkerForTesting } from '../../workers/worker.manager';
import { Worker } from 'bullmq';

describe('Connector Worker Management & All-Type Scan Execution', () => {
  const connectorId = 'test-conn-123';
  const orgId = 'test-org-123';

  beforeEach(() => {
    process.env.ALLOW_PRIVATE_NETWORK_TARGETS = 'true';
    jest.clearAllMocks();
    mockWorkerInstances.length = 0;
    capturedProcessor = null;
    resetConnectorWorkerForTesting();
  });

  afterEach(() => {
    resetConnectorWorkerForTesting();
  });

  describe('Worker Singleton & Deduplication', () => {
    it('initializes exactly ONE worker on connector-scans and returns the same instance on subsequent calls', () => {
      const worker1 = setupConnectorWorkers();
      expect(worker1).not.toBeNull();
      expect(Worker).toHaveBeenCalledTimes(1);
      expect(Worker).toHaveBeenCalledWith(
        'connector-scans',
        expect.any(Function),
        expect.objectContaining({ concurrency: 5 })
      );

      // Subsequent call should return the existing worker without creating a duplicate
      const worker2 = setupConnectorWorkers();
      expect(worker2).toBe(worker1);
      expect(Worker).toHaveBeenCalledTimes(1);
      expect(mockWorkerInstances.length).toBe(1);
    });
  });

  describe('Execution for ALL Connector Types', () => {
    beforeEach(() => {
      setupConnectorWorkers();
      expect(capturedProcessor).toBeInstanceOf(Function);
    });

    it('proves S3 connector scan is actually executed', async () => {
      mockConnectorsFindUnique.mockResolvedValue({
        id: connectorId,
        name: 'Production S3 Bucket',
        type: 's3',
        organizationId: orgId,
        credentials: JSON.stringify({
          accessKeyId: 'fake-ak',
          secretAccessKey: 'fake-sk',
          region: 'us-east-1',
          bucketName: 'data-bucket',
        }),
        health_score: 100,
        daily_cost_total: 0,
        scan_policy: { maxDailyCost: 10 },
      });

      mockS3Send
        .mockResolvedValueOnce({
          Contents: [{ Key: 'test.txt', Size: 20 }],
        })
        .mockResolvedValueOnce({
          Body: {
            transformToString: jest.fn().mockResolvedValue('Hello safe world'),
          },
        });

      mockConnectorsUpdate.mockResolvedValue({ id: connectorId });

      const job = {
        id: 'job-s3-1',
        data: { type: 's3', connectorId, trigger: 'manual' },
      };

      const result = await capturedProcessor!(job);
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(mockS3Send).toHaveBeenCalled();
      expect(mockConnectorsUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: connectorId },
          data: expect.objectContaining({
            last_scan_reason: expect.anything(),
          }),
        })
      );
    });

    it('proves Google Drive connector scan is actually executed', async () => {
      mockConnectorsFindUnique.mockResolvedValue({
        id: connectorId,
        name: 'Company Drive',
        type: 'gdrive',
        organizationId: orgId,
        credentials: JSON.stringify({
          client_email: 'service@corp.iam.gserviceaccount.com',
          private_key: 'fake-pem-key',
        }),
        health_score: 100,
        daily_cost_total: 0,
        scan_policy: { maxDailyCost: 10 },
      });

      mockDriveFilesList.mockResolvedValueOnce({
        data: {
          files: [{ id: 'f1', name: 'report.txt', mimeType: 'text/plain', size: 100 }],
        },
      });
      mockDriveFilesGet.mockResolvedValueOnce({
        data: 'Regular quarterly report contents',
      });

      mockConnectorsUpdate.mockResolvedValue({ id: connectorId });

      const job = {
        id: 'job-gdrive-1',
        data: { type: 'gdrive', connectorId, trigger: 'manual' },
      };

      const result = await capturedProcessor!(job);
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(mockDriveFilesList).toHaveBeenCalled();
    });

    it('proves PostgreSQL connector scan is actually executed with type "postgres"', async () => {
      mockConnectorsFindUnique.mockResolvedValue({
        id: connectorId,
        name: 'App PostgreSQL',
        type: 'postgres',
        organizationId: orgId,
        credentials: JSON.stringify({
          host: 'localhost',
          port: 5432,
          database: 'appdb',
          user: 'postgres',
          password: 'password',
        }),
        health_score: 100,
        daily_cost_total: 0,
        scan_policy: { maxDailyCost: 10 },
      });

      mockPgConnect.mockResolvedValueOnce(undefined);
      mockPgQuery.mockResolvedValueOnce({
        rows: [{ table_name: 'orders', column_name: 'amount', data_type: 'numeric' }],
      });
      mockPgEnd.mockResolvedValueOnce(undefined);
      mockConnectorsUpdate.mockResolvedValue({ id: connectorId });

      const job = {
        id: 'job-pg-1',
        data: { type: 'postgres', connectorId, trigger: 'manual' },
      };

      const result = await capturedProcessor!(job);
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(mockPgConnect).toHaveBeenCalled();
      expect(mockPgQuery).toHaveBeenCalled();
    });

    it('proves SQL connector scan is actually executed with type "sql"', async () => {
      mockConnectorsFindUnique.mockResolvedValue({
        id: connectorId,
        name: 'Analytics SQL',
        type: 'sql',
        organizationId: orgId,
        credentials: JSON.stringify({
          host: 'localhost',
          port: 5432,
          database: 'analytics',
          user: 'postgres',
          password: 'password',
        }),
        health_score: 100,
        daily_cost_total: 0,
        scan_policy: { maxDailyCost: 10 },
      });

      mockPgConnect.mockResolvedValueOnce(undefined);
      mockPgQuery.mockResolvedValueOnce({
        rows: [{ table_name: 'users', column_name: 'email', data_type: 'varchar' }],
      });
      mockPgEnd.mockResolvedValueOnce(undefined);
      mockConnectorsUpdate.mockResolvedValue({ id: connectorId });

      const job = {
        id: 'job-sql-1',
        data: { type: 'sql', connectorId, trigger: 'manual' },
      };

      const result = await capturedProcessor!(job);
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(mockPgConnect).toHaveBeenCalled();
    });

    it('proves Slack connector scan is actually executed', async () => {
      mockConnectorsFindUnique.mockResolvedValue({
        id: connectorId,
        name: 'Workspace Slack',
        type: 'slack',
        organizationId: orgId,
        credentials: JSON.stringify({
          botToken: 'xoxb-fake-placeholder-test-bot-token-worker-test',
        }),
        health_score: 100,
        daily_cost_total: 0,
        scan_policy: { maxDailyCost: 10 },
      });

      mockSlackConversationsList.mockResolvedValueOnce({
        ok: true,
        channels: [{ id: 'C100', name: 'general', is_member: true }],
      });
      mockSlackConversationsHistory.mockResolvedValueOnce({
        ok: true,
        messages: [{ ts: '1700000000.123', text: 'Hello team' }],
      });
      mockConnectorsUpdate.mockResolvedValue({ id: connectorId });

      const job = {
        id: 'job-slack-1',
        data: { type: 'slack', connectorId, trigger: 'manual' },
      };

      const result = await capturedProcessor!(job);
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(mockSlackConversationsList).toHaveBeenCalled();
      expect(mockSlackConversationsHistory).toHaveBeenCalled();
    });
  });

  describe('Unknown Connector Types Fail Loudly', () => {
    beforeEach(() => {
      setupConnectorWorkers();
      expect(capturedProcessor).toBeInstanceOf(Function);
    });

    it('fails loudly and rejects the job when connector type is unknown', async () => {
      mockConnectorsFindUnique.mockResolvedValue({
        id: connectorId,
        name: 'Alien Database',
        type: 'unsupported_connector_type',
        organizationId: orgId,
        credentials: JSON.stringify({ key: 'value' }),
        health_score: 100,
        daily_cost_total: 0,
        scan_policy: {},
      });
      mockConnectorsUpdate.mockResolvedValue({ id: connectorId });

      const job = {
        id: 'job-unknown-1',
        data: { type: 'unsupported_connector_type', connectorId, trigger: 'manual' },
      };

      // Must throw an error loudly instead of doing nothing or succeeding silently
      await expect(capturedProcessor!(job)).rejects.toThrow(
        /Unsupported connector type "unsupported_connector_type"/
      );

      // Must mark connector in error state in DB
      expect(mockConnectorsUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: connectorId },
          data: expect.objectContaining({
            status: 'error',
            last_error: expect.stringContaining('unsupported_connector_type'),
          }),
        })
      );
    });

    it('fails loudly when connectorId is missing from job data', async () => {
      const job = {
        id: 'job-missing-id',
        data: { type: 'slack' },
      };

      await expect(capturedProcessor!(job)).rejects.toThrow(
        /missing connectorId/i
      );
    });
  });
});

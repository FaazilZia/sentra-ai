const mockDbDelegates: Record<string, any> = {};
const mockS3Send = jest.fn();

import {
  defaultJobOptions,
  isCustomPortApprovedByAdmin,
  isSupportedConnectorType,
  callSlackWithBackoff,
  enqueueLog,
  enqueueGovernanceSeed,
  enqueueConnectorScan,
  triggerAnomalyScan,
  setupScheduledJobs,
  processConnectorScan,
  activityQueue,
  connectorQueue,
  retentionQueue,
  governanceQueue,
  driftQueue,
} from '../../services/queue.service';

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'job-id' }),
    close: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
  })),
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('../../config/redis', () => ({
  getRedisClient: jest.fn().mockReturnValue({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    ping: jest.fn().mockResolvedValue('PONG'),
  }),
  getRedisUrl: jest.fn().mockReturnValue('redis://localhost:6379'),
  buildRedisOptions: jest.fn().mockReturnValue({}),
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../../services/policy.service', () => ({
  logActivity: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../utils/credentialHelper', () => ({
  decryptCredentials: jest.fn((c) => {
    if (typeof c === 'string') {
      try {
        return JSON.parse(c);
      } catch {
        return { token: c };
      }
    }
    return c;
  }),
  normalizePrivateKey: jest.fn((k) => k),
}));

jest.mock('../../utils/ssrfProtection', () => ({
  assertSafeTarget: jest.fn().mockResolvedValue('93.184.216.34'),
}));

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: mockS3Send,
  })),
  ListObjectsV2Command: class ListObjectsV2Command {
    name = 'ListObjectsV2Command';
    constructor(public opts: any) {}
  },
  GetObjectCommand: class GetObjectCommand {
    name = 'GetObjectCommand';
    constructor(public opts: any) {}
  },
}));

jest.mock('googleapis', () => ({
  google: {
    auth: {
      JWT: jest.fn().mockImplementation(() => ({})),
    },
    drive: jest.fn().mockImplementation(() => ({
      files: {
        list: jest.fn().mockResolvedValue({
          data: {
            files: [
              { id: 'f-1', name: 'notes.doc', mimeType: 'application/vnd.google-apps.document' },
              { id: 'f-2', name: 'data.txt', mimeType: 'text/plain' },
            ],
          },
        }),
        get: jest.fn().mockResolvedValue({ data: 'file content text email: test@sentra.ai' }),
        export: jest.fn().mockResolvedValue({ data: 'exported document text with ssn: 000-11-2222' }),
      },
    })),
  },
}));

jest.mock('pg', () => ({
  Client: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    query: jest.fn().mockResolvedValue({
      rows: [
        { table_name: 'users', column_name: 'email', data_type: 'varchar' },
        { table_name: 'users', column_name: 'password', data_type: 'varchar' },
        { table_name: 'orders', column_name: 'id', data_type: 'integer' },
      ],
    }),
    end: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('@slack/web-api', () => ({
  WebClient: jest.fn().mockImplementation(() => ({
    auth: { test: jest.fn().mockResolvedValue({ ok: true, team: 'TestTeam' }) },
    conversations: {
      list: jest.fn().mockResolvedValue({
        ok: true,
        channels: [{ id: 'C123', name: 'general', is_member: true }],
      }),
      history: jest.fn().mockResolvedValue({
        ok: true,
        messages: [
          {
            text: 'Here is private info: email contact@sentra.ai',
            ts: '1700000001.000100',
            files: [
              {
                id: 'F123',
                name: 'audit-log.txt',
                mimetype: 'text/plain',
                size: 500,
                url_private_download: 'https://files.slack.com/files-pri/T00/audit-log.txt',
              },
            ],
          },
        ],
      }),
    },
  })),
}));

global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  text: () => Promise.resolve('Audit file content with sensitive email support@sentra.ai'),
});

jest.mock('../../config/db', () => ({
  __esModule: true,
  default: new Proxy(mockDbDelegates, {
    get: (target, prop: string) => {
      if (typeof prop === 'string' && prop in target) return target[prop];
      return {
        create: jest.fn().mockResolvedValue({ id: 'mock-id' }),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({ id: 'mock-id' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        delete: jest.fn().mockResolvedValue({ id: 'mock-id' }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        count: jest.fn().mockResolvedValue(0),
      };
    },
  }),
}));

import prisma from '../../config/db';
import { logActivity } from '../../services/policy.service';
import { assertSafeTarget } from '../../utils/ssrfProtection';

describe('Queue Service & Background Worker Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockS3Send.mockImplementation((cmd: any) => {
      if (cmd.name === 'ListObjectsV2Command') {
        return Promise.resolve({ Contents: [{ Key: 'customer-data.csv' }] });
      }
      return Promise.resolve({
        Body: {
          transformToString: () => Promise.resolve('user email: customer@example.com ssn: 123-45-6789'),
        },
      });
    });
  });

  describe('defaultJobOptions', () => {
    it('defines exponential backoff and attempt limits', () => {
      expect(defaultJobOptions.attempts).toBe(3);
      expect(defaultJobOptions.backoff.type).toBe('exponential');
      expect(defaultJobOptions.backoff.delay).toBe(2000);
      expect(defaultJobOptions.removeOnComplete).toEqual({ count: 100 });
      expect(defaultJobOptions.removeOnFail).toBe(false);
    });
  });

  describe('isSupportedConnectorType', () => {
    it('returns true for all supported connector types in any casing', () => {
      expect(isSupportedConnectorType('postgres')).toBe(true);
      expect(isSupportedConnectorType('POSTGRES')).toBe(true);
      expect(isSupportedConnectorType('sql')).toBe(true);
      expect(isSupportedConnectorType('s3')).toBe(true);
      expect(isSupportedConnectorType('S3')).toBe(true);
      expect(isSupportedConnectorType('gdrive')).toBe(true);
      expect(isSupportedConnectorType('slack')).toBe(true);
    });

    it('returns false for unknown or falsy connector types', () => {
      expect(isSupportedConnectorType('local')).toBe(false);
      expect(isSupportedConnectorType('ftp')).toBe(false);
      expect(isSupportedConnectorType('')).toBe(false);
      expect(isSupportedConnectorType(null as any)).toBe(false);
    });
  });

  describe('enqueueLog', () => {
    it('enqueues log to BullMQ activityQueue when available', async () => {
      const logData = { action: 'READ', userId: 'user-1' };
      await enqueueLog(logData);

      expect(activityQueue?.add).toHaveBeenCalledWith('log', logData, {
        removeOnComplete: true,
        removeOnFail: 1000,
      });
      expect(logActivity).not.toHaveBeenCalled();
    });

    it('falls back to synchronous logActivity when queue add fails', async () => {
      (activityQueue?.add as jest.Mock).mockRejectedValueOnce(new Error('Redis full'));
      const logData = { action: 'WRITE', userId: 'user-2' };
      await enqueueLog(logData);

      expect(logActivity).toHaveBeenCalledWith(logData);
    });
  });

  describe('enqueueGovernanceSeed', () => {
    it('enqueues seed-governance job and returns true on success', async () => {
      const res = await enqueueGovernanceSeed('org-gov-1');
      expect(res).toBe(true);
      expect(governanceQueue?.add).toHaveBeenCalledWith(
        'seed-governance',
        { organizationId: 'org-gov-1' },
        expect.objectContaining({
          jobId: 'seed-gov-org-gov-1',
          attempts: 3,
        })
      );
    });

    it('returns false when queue throws error', async () => {
      (governanceQueue?.add as jest.Mock).mockRejectedValueOnce(new Error('Queue offline'));
      const res = await enqueueGovernanceSeed('org-gov-fail');
      expect(res).toBe(false);
    });
  });

  describe('enqueueConnectorScan & triggerAnomalyScan', () => {
    it('enqueues connector scan with priority and reason', async () => {
      await enqueueConnectorScan('postgres', 'conn-1', { priority: 5, reason: 'scheduled' });
      expect(connectorQueue?.add).toHaveBeenCalledWith(
        expect.stringMatching(/^scan-conn-1-/),
        { type: 'postgres', connectorId: 'conn-1', reason: 'scheduled' },
        { priority: 5 }
      );
    });

    it('triggers high-priority anomaly scan when connector exists', async () => {
      mockDbDelegates.connectors = {
        findUnique: jest.fn().mockResolvedValue({
          id: 'conn-anomaly-1',
          name: 'S3 Data Lake',
          type: 's3',
        }),
      };

      await triggerAnomalyScan('conn-anomaly-1', 'excessive_traffic');
      expect(connectorQueue?.add).toHaveBeenCalledWith(
        expect.stringMatching(/^scan-conn-anomaly-1-/),
        { type: 's3', connectorId: 'conn-anomaly-1', reason: 'anomaly:excessive_traffic' },
        { priority: 1 }
      );
    });

    it('does nothing if connector for anomaly does not exist', async () => {
      mockDbDelegates.connectors = {
        findUnique: jest.fn().mockResolvedValue(null),
      };

      await triggerAnomalyScan('nonexistent', 'high_error_rate');
      expect(connectorQueue?.add).not.toHaveBeenCalled();
    });
  });

  describe('setupScheduledJobs', () => {
    it('registers recurring jobs for retention, discovery, drift, and automations', async () => {
      await setupScheduledJobs();

      expect(retentionQueue?.add).toHaveBeenCalledWith(
        'daily-budget-reset',
        {},
        expect.objectContaining({ repeat: { pattern: '0 0 * * *' } })
      );
      expect(connectorQueue?.add).toHaveBeenCalledWith(
        'priority-router',
        { action: 'RESCHEDULE_ALL' },
        expect.objectContaining({ repeat: { pattern: '*/15 * * * *' } })
      );
      expect(driftQueue?.add).toHaveBeenCalledWith(
        'drift-scan',
        { action: 'drift-scan' },
        expect.any(Object)
      );
      expect(driftQueue?.add).toHaveBeenCalledWith(
        'baseline-refresh',
        { action: 'baseline-refresh' },
        expect.objectContaining({ repeat: { pattern: '0 */6 * * *' } })
      );
    });
  });

  describe('callSlackWithBackoff', () => {
    it('executes API call successfully without retries', async () => {
      const mockFn = jest.fn().mockResolvedValue({ ok: true, data: 'slack-data' });
      const result = await callSlackWithBackoff(mockFn, 2, 10);
      expect(result).toEqual({ ok: true, data: 'slack-data' });
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('retries on rate limit (status 429) and succeeds on next attempt', async () => {
      const rateLimitErr = Object.assign(new Error('Rate limited'), { status: 429 });
      const mockFn = jest.fn()
        .mockRejectedValueOnce(rateLimitErr)
        .mockResolvedValueOnce({ ok: true });

      const result = await callSlackWithBackoff(mockFn, 2, 5);
      expect(result).toEqual({ ok: true });
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('throws immediately on non-429 error without retrying', async () => {
      const authErr = Object.assign(new Error('invalid_auth'), { status: 401 });
      const mockFn = jest.fn().mockRejectedValue(authErr);

      await expect(callSlackWithBackoff(mockFn, 3, 5)).rejects.toThrow('invalid_auth');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('isCustomPortApprovedByAdmin', () => {
    it('returns false when allowCustomPort is not set', async () => {
      const res = await isCustomPortApprovedByAdmin({ organizationId: 'org-1', config: {} });
      expect(res).toBe(false);
    });

    it('returns false when allowCustomPortApprovedBy is missing or not a string', async () => {
      const res = await isCustomPortApprovedByAdmin({ organizationId: 'org-1', config: { allowCustomPort: true } });
      expect(res).toBe(false);
    });

    it('returns false when approver does not exist in DB', async () => {
      mockDbDelegates.users = { findUnique: jest.fn().mockResolvedValue(null) };
      const res = await isCustomPortApprovedByAdmin({
        organizationId: 'org-1',
        config: { allowCustomPort: true, allowCustomPortApprovedBy: 'ghost-user' },
      });
      expect(res).toBe(false);
    });

    it('returns false when approver is inactive', async () => {
      mockDbDelegates.users = {
        findUnique: jest.fn().mockResolvedValue({
          id: 'admin-1',
          role: 'ADMIN',
          organizationId: 'org-1',
          is_active: false,
        }),
      };
      const res = await isCustomPortApprovedByAdmin({
        organizationId: 'org-1',
        config: { allowCustomPort: true, allowCustomPortApprovedBy: 'admin-1' },
      });
      expect(res).toBe(false);
    });

    it('returns false when approver belongs to a different organization', async () => {
      mockDbDelegates.users = {
        findUnique: jest.fn().mockResolvedValue({
          id: 'admin-1',
          role: 'ADMIN',
          organizationId: 'org-different',
          is_active: true,
        }),
      };
      const res = await isCustomPortApprovedByAdmin({
        organizationId: 'org-1',
        config: { allowCustomPort: true, allowCustomPortApprovedBy: 'admin-1' },
      });
      expect(res).toBe(false);
    });

    it('returns false when approver is a regular MEMBER', async () => {
      mockDbDelegates.users = {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-1',
          role: 'MEMBER',
          organizationId: 'org-1',
          is_active: true,
        }),
      };
      const res = await isCustomPortApprovedByAdmin({
        organizationId: 'org-1',
        config: { allowCustomPort: true, allowCustomPortApprovedBy: 'user-1' },
      });
      expect(res).toBe(false);
    });

    it('returns true when approver is active ADMIN in same organization', async () => {
      mockDbDelegates.users = {
        findUnique: jest.fn().mockResolvedValue({
          id: 'admin-1',
          role: 'ADMIN',
          organizationId: 'org-1',
          is_active: true,
        }),
      };
      const res = await isCustomPortApprovedByAdmin({
        organizationId: 'org-1',
        config: { allowCustomPort: true, allowCustomPortApprovedBy: 'admin-1' },
      });
      expect(res).toBe(true);
    });

    it('returns true immediately when ALLOW_CUSTOM_DB_PORTS environment variable is true', async () => {
      const orig = process.env.ALLOW_CUSTOM_DB_PORTS;
      try {
        process.env.ALLOW_CUSTOM_DB_PORTS = 'true';
        const res = await isCustomPortApprovedByAdmin({ organizationId: 'org-1', config: {} });
        expect(res).toBe(true);
      } finally {
        process.env.ALLOW_CUSTOM_DB_PORTS = orig;
      }
    });
  });

  describe('processConnectorScan', () => {
    it('throws error and updates status to error for unsupported connector types', async () => {
      mockDbDelegates.connectors = {
        update: jest.fn().mockResolvedValue({}),
      };

      await expect(processConnectorScan('unsupported-type', 'conn-bad')).rejects.toThrow(
        'Unsupported connector type "unsupported-type"'
      );
      expect(mockDbDelegates.connectors.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'conn-bad' },
          data: expect.objectContaining({ status: 'error' }),
        })
      );
    });

    it('returns undefined if connector is not found in database', async () => {
      mockDbDelegates.connectors = {
        findUnique: jest.fn().mockResolvedValue(null),
      };

      const result = await processConnectorScan('s3', 'conn-missing');
      expect(result).toBeUndefined();
    });

    it('pauses scan and marks status paused_budget when daily cost cap is exceeded', async () => {
      mockDbDelegates.connectors = {
        findUnique: jest.fn().mockResolvedValue({
          id: 'conn-budget',
          name: 'Costly Connector',
          type: 's3',
          daily_cost_total: 50.0,
          scan_policy: { maxDailyCost: 20.0 },
        }),
        update: jest.fn().mockResolvedValue({}),
      };

      const result = await processConnectorScan('s3', 'conn-budget');
      expect(result).toEqual({ success: false, reason: 'paused_budget' });
      expect(mockDbDelegates.connectors.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'conn-budget' },
          data: expect.objectContaining({ status: 'paused_budget' }),
        })
      );
    });

    it('fails gracefully and records error when credentials are missing or invalid', async () => {
      mockDbDelegates.connectors = {
        findUnique: jest.fn().mockResolvedValue({
          id: 'conn-no-creds',
          name: 'Missing Creds',
          type: 's3',
          daily_cost_total: 0,
          config: {},
        }),
        update: jest.fn().mockResolvedValue({}),
      };

      const result = await processConnectorScan('s3', 'conn-no-creds');
      expect(result?.success).toBe(false);
      expect(result?.error).toContain('Missing credentials');
      expect(mockDbDelegates.connectors.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'conn-no-creds' },
          data: expect.objectContaining({ status: 'error', health_score: 0 }),
        })
      );
    });

    it('successfully processes S3 connector scan and detects PII violations', async () => {
      mockDbDelegates.connectors = {
        findUnique: jest.fn().mockResolvedValue({
          id: 'conn-s3-scan',
          name: 'S3 Data Lake',
          type: 's3',
          organizationId: 'org-1',
          daily_cost_total: 0,
          health_score: 100,
          credentials: JSON.stringify({
            accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
            secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
            bucketName: 'sentra-test-bucket',
            region: 'us-east-1',
          }),
        }),
        update: jest.fn().mockResolvedValue({}),
      };

      const result = await processConnectorScan('s3', 'conn-s3-scan');
      expect(result?.success).toBe(true);
      expect(result?.apiCalls).toBeGreaterThan(0);
      expect(result?.violations).toBeGreaterThan(0); // email + ssn detected in mock content
      expect(mockDbDelegates.connectors.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'conn-s3-scan' },
          data: expect.objectContaining({
            status: 'active',
            daily_scan_count: { increment: 1 },
          }),
        })
      );
    });

    it('successfully processes Google Drive connector scan', async () => {
      mockDbDelegates.connectors = {
        findUnique: jest.fn().mockResolvedValue({
          id: 'conn-gdrive-scan',
          name: 'GDrive Corp',
          type: 'gdrive',
          organizationId: 'org-1',
          daily_cost_total: 0,
          health_score: 100,
          credentials: JSON.stringify({
            client_email: 'svc@sentra.iam.gserviceaccount.com',
            private_key: '-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----',
          }),
        }),
        update: jest.fn().mockResolvedValue({}),
      };

      const result = await processConnectorScan('gdrive', 'conn-gdrive-scan');
      expect(result?.success).toBe(true);
      expect(result?.apiCalls).toBeGreaterThan(0);
      expect(result?.bytesScanned).toBeGreaterThan(0);
    });

    it('verifies custom S3 endpoint via assertSafeTarget', async () => {
      mockDbDelegates.connectors = {
        findUnique: jest.fn().mockResolvedValue({
          id: 'conn-s3-endpoint',
          name: 'Custom S3',
          type: 's3',
          organizationId: 'org-1',
          daily_cost_total: 0,
          health_score: 100,
          credentials: JSON.stringify({
            accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
            secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
            bucketName: 'sentra-custom-bucket',
            endpoint: 'https://minio.company.internal:9000',
          }),
        }),
        update: jest.fn().mockResolvedValue({}),
      };

      const result = await processConnectorScan('s3', 'conn-s3-endpoint');
      expect(result?.success).toBe(true);
      expect(assertSafeTarget).toHaveBeenCalledWith('minio.company.internal');
    });

    it('verifies custom GDrive endpoint via assertSafeTarget', async () => {
      mockDbDelegates.connectors = {
        findUnique: jest.fn().mockResolvedValue({
          id: 'conn-gdrive-endpoint',
          name: 'Custom GDrive',
          type: 'gdrive',
          organizationId: 'org-1',
          daily_cost_total: 0,
          health_score: 100,
          credentials: JSON.stringify({
            client_email: 'svc@sentra.iam.gserviceaccount.com',
            private_key: '-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----',
            endpoint: 'https://proxy.drive.sentra.ai',
          }),
        }),
        update: jest.fn().mockResolvedValue({}),
      };

      const result = await processConnectorScan('gdrive', 'conn-gdrive-endpoint');
      expect(result?.success).toBe(true);
      expect(assertSafeTarget).toHaveBeenCalledWith('proxy.drive.sentra.ai');
    });

    it('successfully processes PostgreSQL database metadata scan', async () => {
      mockDbDelegates.connectors = {
        findUnique: jest.fn().mockResolvedValue({
          id: 'conn-sql-scan',
          name: 'Production DB',
          type: 'postgres',
          organizationId: 'org-1',
          daily_cost_total: 0,
          health_score: 100,
          config: { schema: 'public' },
          credentials: JSON.stringify({
            host: 'db.example.com',
            port: 5432,
            user: 'scanner',
            password: 'secret-password',
            database: 'app_prod',
          }),
        }),
        update: jest.fn().mockResolvedValue({}),
      };

      const result = await processConnectorScan('postgres', 'conn-sql-scan');
      expect(result?.success).toBe(true);
      expect(result?.violations).toBeGreaterThan(0); // email & password column names detected
      expect(mockDbDelegates.connectors.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'conn-sql-scan' },
          data: expect.objectContaining({ status: 'active' }),
        })
      );
    });

    it('successfully processes Slack workspace messages scan', async () => {
      mockDbDelegates.connectors = {
        findUnique: jest.fn().mockResolvedValue({
          id: 'conn-slack-scan',
          name: 'Corp Slack',
          type: 'slack',
          organizationId: 'org-1',
          daily_cost_total: 0,
          health_score: 100,
          credentials: JSON.stringify({
            botToken: 'xoxb-valid-slack-bot-token-12345678',
          }),
        }),
        update: jest.fn().mockResolvedValue({}),
      };

      const result = await processConnectorScan('slack', 'conn-slack-scan');
      expect(result?.success).toBe(true);
      expect(result?.apiCalls).toBeGreaterThan(0);
      expect(result?.violations).toBeGreaterThan(0); // email pattern found in mock message
    });

    it('catches scan execution errors, formats human error, and updates connector status', async () => {
      mockDbDelegates.connectors = {
        findUnique: jest.fn().mockResolvedValue({
          id: 'conn-s3-fail',
          name: 'Failing S3',
          type: 's3',
          organizationId: 'org-1',
          daily_cost_total: 0,
          health_score: 100,
          credentials: JSON.stringify({
            accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
            secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
            bucketName: 'nonexistent-bucket',
          }),
        }),
        update: jest.fn().mockResolvedValue({}),
      };

      mockS3Send.mockRejectedValueOnce(new Error('NoSuchBucket: Bucket not found'));

      const result = await processConnectorScan('s3', 'conn-s3-fail');
      expect(result?.success).toBe(false);
      expect(result?.error).toContain('Specified S3 bucket does not exist');
      expect(mockDbDelegates.connectors.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'conn-s3-fail' },
          data: expect.objectContaining({ status: 'error' }),
        })
      );

      // Test database auth error branch
      mockS3Send.mockRejectedValueOnce(new Error('password authentication failed for user'));
      const dbErrResult = await processConnectorScan('s3', 'conn-s3-fail');
      expect(dbErrResult?.error).toContain('Database authentication failed');

      // Test gdrive auth error branch
      mockS3Send.mockRejectedValueOnce(new Error('invalid_grant: bad credentials'));
      const gdriveErrResult = await processConnectorScan('s3', 'conn-s3-fail');
      expect(gdriveErrResult?.error).toContain('Google Drive authentication failed');

      // Test connection refused branch
      mockS3Send.mockRejectedValueOnce(new Error('ECONNREFUSED'));
      const connErrResult = await processConnectorScan('s3', 'conn-s3-fail');
      expect(connErrResult?.error).toContain('Connection refused: Host unreachable');
    });
  });
});

import { testConnectorSource } from '../../services/connectorTest.service';
import { S3Client } from '@aws-sdk/client-s3';
import { google } from 'googleapis';
import { Client as PgClient } from 'pg';

const mockDriveFn = jest.fn();
const mockJwtFn = jest.fn();
const mockSlackAuthTest = jest.fn();
const mockSlackConversationsList = jest.fn();

jest.mock('@aws-sdk/client-s3');
jest.mock('@slack/web-api', () => ({
  WebClient: jest.fn().mockImplementation(() => ({
    auth: { test: mockSlackAuthTest },
    conversations: { list: mockSlackConversationsList },
  })),
}));
jest.mock('googleapis', () => ({
  __esModule: true,
  google: {
    drive: mockDriveFn,
    auth: {
      JWT: mockJwtFn,
    },
  },
  default: {
    google: {
      drive: mockDriveFn,
      auth: {
        JWT: mockJwtFn,
      },
    },
  },
}));
jest.mock('pg');

describe('Connector Test Connection Service', () => {
  const originalEnv = process.env.ALLOW_PRIVATE_NETWORK_TARGETS;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ALLOW_PRIVATE_NETWORK_TARGETS = 'false';
  });

  afterEach(() => {
    process.env.ALLOW_PRIVATE_NETWORK_TARGETS = originalEnv;
  });

  describe('S3 Connection Test', () => {
    it('returns error if bucketName or credentials missing', async () => {
      const res = await testConnectorSource('s3', {}, {});
      expect(res.success).toBe(false);
      expect(res.message).toContain('Bucket name is required');
    });

    it('returns success when S3Client succeeds', async () => {
      const mockSend = jest.fn().mockResolvedValueOnce({});
      (S3Client as jest.Mock).mockImplementation(() => ({
        send: mockSend,
      }));

      const res = await testConnectorSource(
        's3',
        { bucketName: 'prod-bucket', region: 'us-east-1' },
        { accessKeyId: 'AKIAEXAMPLE', secretAccessKey: 'secret' }
      );

      expect(res.success).toBe(true);
      expect(res.message).toContain('Successfully connected to S3 bucket "prod-bucket"');
    });

    it('returns friendly error when AccessDenied occurs', async () => {
      const mockSend = jest.fn().mockRejectedValueOnce(new Error('AccessDenied: User not authorized'));
      (S3Client as jest.Mock).mockImplementation(() => ({
        send: mockSend,
      }));

      const res = await testConnectorSource(
        's3',
        { bucketName: 'locked-bucket' },
        { accessKeyId: 'AKIAEXAMPLE', secretAccessKey: 'secret' }
      );

      expect(res.success).toBe(false);
      expect(res.message).toContain('Access Denied');
    });
  });

  describe('Google Drive Connection Test', () => {
    it('returns error if client_email or private_key is missing', async () => {
      const res = await testConnectorSource('gdrive', {}, {});
      expect(res.success).toBe(false);
      expect(res.message).toContain('client email is required');
    });

    it('normalizes private key and returns success when API responds with files', async () => {
      const mockList = jest.fn().mockResolvedValueOnce({
        data: { files: [{ id: '1', name: 'report.pdf' }] },
      });
      mockDriveFn.mockReturnValue({
        files: { list: mockList },
      });

      const res = await testConnectorSource(
        'gdrive',
        {},
        {
          client_email: 'sa@test.iam.gserviceaccount.com',
          private_key: '-----BEGIN PRIVATE KEY-----\\nMIIEvg...\\n-----END PRIVATE KEY-----\\n',
        }
      );

      expect(res.success).toBe(true);
      expect(res.warning).toBe(false);
      expect(res.message).toContain('Successfully connected to Google Drive API');
      expect(res.message).toContain('Found 1 readable file(s)');
      expect(res.details?.fileCount).toBe(1);
    });

    it('returns warning state when 0 readable files are found in scope', async () => {
      const mockList = jest.fn().mockResolvedValueOnce({
        data: { files: [] },
      });
      mockDriveFn.mockReturnValue({
        files: { list: mockList },
      });

      const res = await testConnectorSource(
        'gdrive',
        {},
        {
          client_email: 'sa@test.iam.gserviceaccount.com',
          private_key: '-----BEGIN PRIVATE KEY-----\\nMIIEvg...\\n-----END PRIVATE KEY-----\\n',
        }
      );

      expect(res.success).toBe(true);
      expect(res.warning).toBe(true);
      expect(res.message).toContain('0 readable files were found in scope');
      expect(res.message).toContain('Ensure target files or folders are shared');
      expect(res.details?.fileCount).toBe(0);
    });

    it('returns friendly error on invalid_grant', async () => {
      const mockList = jest.fn().mockRejectedValueOnce(new Error('invalid_grant: Invalid JWT Signature'));
      mockDriveFn.mockReturnValue({
        files: { list: mockList },
      });

      const res = await testConnectorSource(
        'gdrive',
        {},
        {
          client_email: 'sa@test.iam.gserviceaccount.com',
          private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvg...\n-----END PRIVATE KEY-----',
        }
      );

      expect(res.success).toBe(false);
      expect(res.message).toContain('Google Drive authentication failed');
    });
  });

  describe('PostgreSQL Connection Test', () => {
    it('refuses private/loopback IP address when SSRF protection is active', async () => {
      const res = await testConnectorSource(
        'postgres',
        {},
        {
          host: '127.0.0.1',
          port: 5432,
          user: 'postgres',
          password: 'password',
          database: 'mydb',
        }
      );

      expect(res.success).toBe(false);
      expect(res.message).toContain('SSRF validation failed');
      expect(PgClient).not.toHaveBeenCalled();
    });

    it('refuses AWS metadata IP address when SSRF protection is active', async () => {
      const res = await testConnectorSource(
        'sql',
        {},
        {
          host: '169.254.169.254',
          user: 'postgres',
          password: 'password',
        }
      );

      expect(res.success).toBe(false);
      expect(res.message).toContain('SSRF validation failed');
    });

    it('allows private host when ALLOW_PRIVATE_NETWORK_TARGETS=true', async () => {
      process.env.ALLOW_PRIVATE_NETWORK_TARGETS = 'true';

      const mockQuery = jest.fn()
        .mockResolvedValueOnce({ rows: [{ version: 'PostgreSQL 16.1' }] })
        .mockResolvedValueOnce({ rows: [{ has_usage: true }] })
        .mockResolvedValueOnce({ rows: [{ table_count: 5 }] });

      (PgClient as jest.Mock).mockImplementation(() => ({
        connect: jest.fn().mockResolvedValue(undefined),
        query: mockQuery,
        end: jest.fn().mockResolvedValue(undefined),
      }));

      const res = await testConnectorSource(
        'postgres',
        { schema: 'public' },
        {
          host: '127.0.0.1',
          port: 5432,
          user: 'postgres',
          password: 'password',
          database: 'sentra_test',
        }
      );

      expect(res.success).toBe(true);
      expect(res.message).toContain('Successfully connected to PostgreSQL');
      expect(res.details?.tableCount).toBe(5);
    });

    it('returns clear warning and NOT success when user has 0 readable tables in schema', async () => {
      process.env.ALLOW_PRIVATE_NETWORK_TARGETS = 'true';

      const mockQuery = jest.fn()
        .mockResolvedValueOnce({ rows: [{ version: 'PostgreSQL 16.1' }] })
        .mockResolvedValueOnce({ rows: [{ has_usage: true }] })
        .mockResolvedValueOnce({ rows: [{ table_count: 0 }] });

      (PgClient as jest.Mock).mockImplementation(() => ({
        connect: jest.fn().mockResolvedValue(undefined),
        query: mockQuery,
        end: jest.fn().mockResolvedValue(undefined),
      }));

      const res = await testConnectorSource(
        'postgres',
        { schema: 'public' },
        {
          host: '127.0.0.1',
          port: 5432,
          user: 'sentra_restricted',
          password: 'password',
          database: 'sentra_test',
        }
      );

      expect(res.success).toBe(false);
      expect(res.message).toBe(
        'Connected, but this user cannot read schema public (or it has no tables). Grant USAGE on the schema and SELECT on its tables.'
      );
      expect(res.message).not.toContain('Success');
      expect(res.message).not.toContain('Successfully');
    });

    it('returns clear warning when user lacks USAGE permission on schema', async () => {
      process.env.ALLOW_PRIVATE_NETWORK_TARGETS = 'true';

      const mockQuery = jest.fn()
        .mockResolvedValueOnce({ rows: [{ version: 'PostgreSQL 16.1' }] })
        .mockResolvedValueOnce({ rows: [{ has_usage: false }] })
        .mockResolvedValueOnce({ rows: [{ table_count: 0 }] });

      (PgClient as jest.Mock).mockImplementation(() => ({
        connect: jest.fn().mockResolvedValue(undefined),
        query: mockQuery,
        end: jest.fn().mockResolvedValue(undefined),
      }));

      const res = await testConnectorSource(
        'postgres',
        { schema: 'restricted_schema' },
        {
          host: '127.0.0.1',
          port: 5432,
          user: 'sentra_restricted',
          password: 'password',
          database: 'sentra_test',
        }
      );

      expect(res.success).toBe(false);
      expect(res.message).toBe(
        'Connected, but this user cannot read schema restricted_schema (or it has no tables). Grant USAGE on the schema and SELECT on its tables.'
      );
    });

    it('does not return raw database error in details.raw (Error Text Sanitization)', async () => {
      process.env.ALLOW_PRIVATE_NETWORK_TARGETS = 'true';

      (PgClient as jest.Mock).mockImplementation(() => ({
        connect: jest.fn().mockRejectedValue(new Error('FATAL: relation "internal_secrets" does not exist at character 42')),
        end: jest.fn(),
      }));

      const res = await testConnectorSource(
        'postgres',
        {},
        {
          host: '127.0.0.1',
          user: 'postgres',
          password: 'password',
        }
      );

      expect(res.success).toBe(false);
      expect(res.details?.raw).toBeUndefined();
      expect(res.message).not.toContain('internal_secrets');
      expect(res.message).not.toContain('character 42');
    });

    it('formats friendly error on password authentication failure', async () => {
      process.env.ALLOW_PRIVATE_NETWORK_TARGETS = 'true';

      (PgClient as jest.Mock).mockImplementation(() => ({
        connect: jest.fn().mockRejectedValue(new Error('password authentication failed for user "postgres"')),
        end: jest.fn(),
      }));

      const res = await testConnectorSource(
        'postgres',
        {},
        {
          host: '127.0.0.1',
          user: 'postgres',
          password: 'wrong_password',
        }
      );

      expect(res.success).toBe(false);
      expect(res.message).toContain('Database authentication failed');
    });

    it('enforces TLS verification by default with rejectUnauthorized: true and servername', async () => {
      process.env.ALLOW_PRIVATE_NETWORK_TARGETS = 'true';

      (PgClient as jest.Mock).mockImplementation((opts) => {
        expect(opts.ssl).toEqual({
          rejectUnauthorized: true,
          servername: 'db.example.com',
        });
        return {
          connect: jest.fn().mockResolvedValue(undefined),
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [{ version: 'PostgreSQL 16' }] })
            .mockResolvedValueOnce({ rows: [{ has_usage: true }] })
            .mockResolvedValueOnce({ rows: [{ table_count: 5 }] }),
          end: jest.fn().mockResolvedValue(undefined),
        };
      });

      const res = await testConnectorSource(
        'postgres',
        { schema: 'public' },
        {
          host: 'db.example.com',
          port: 5432,
          user: 'postgres',
          password: 'secret_password',
          database: 'prod_db',
        }
      );

      expect(res.success).toBe(true);
    });

    it('sets rejectUnauthorized: false when allowSelfSigned is explicitly true', async () => {
      process.env.ALLOW_PRIVATE_NETWORK_TARGETS = 'true';

      (PgClient as jest.Mock).mockImplementation((opts) => {
        expect(opts.ssl).toEqual({
          rejectUnauthorized: false,
          servername: 'db.example.com',
        });
        return {
          connect: jest.fn().mockResolvedValue(undefined),
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [{ version: 'PostgreSQL 16' }] })
            .mockResolvedValueOnce({ rows: [{ has_usage: true }] })
            .mockResolvedValueOnce({ rows: [{ table_count: 5 }] }),
          end: jest.fn().mockResolvedValue(undefined),
        };
      });

      const res = await testConnectorSource(
        'postgres',
        { schema: 'public', allowSelfSigned: true },
        {
          host: 'db.example.com',
          port: 5432,
          user: 'postgres',
          password: 'secret_password',
          database: 'prod_db',
        }
      );

      expect(res.success).toBe(true);
    });

    it('returns friendly error when self-signed certificate is encountered and allowSelfSigned is false', async () => {
      process.env.ALLOW_PRIVATE_NETWORK_TARGETS = 'true';

      (PgClient as jest.Mock).mockImplementation(() => ({
        connect: jest.fn().mockRejectedValue(new Error('DEPTH_ZERO_SELF_SIGNED_CERT: self-signed certificate in chain')),
        end: jest.fn(),
      }));

      const res = await testConnectorSource(
        'postgres',
        {},
        {
          host: 'db.example.com',
          user: 'postgres',
          password: 'password',
        }
      );

      expect(res.success).toBe(false);
      expect(res.message).toContain('Self-signed certificate in chain');
      expect(res.message).toContain('Allow self-signed certificate (not recommended)');
    });

    it('returns friendly error when certificate hostname does not match requested host', async () => {
      process.env.ALLOW_PRIVATE_NETWORK_TARGETS = 'true';

      (PgClient as jest.Mock).mockImplementation(() => ({
        connect: jest.fn().mockRejectedValue(new Error("ERR_TLS_CERT_ALTNAME_INVALID: Host: db.example.com is not in the cert's altnames")),
        end: jest.fn(),
      }));

      const res = await testConnectorSource(
        'postgres',
        {},
        {
          host: 'db.example.com',
          user: 'postgres',
          password: 'password',
        }
      );

      expect(res.success).toBe(false);
      expect(res.message).toContain('SSL/TLS certificate hostname mismatch');
    });

    it('restricts PostgreSQL ports to 5432, 5433, 6432, 6543 by default unless explicit admin setting is present', async () => {
      process.env.ALLOW_PRIVATE_NETWORK_TARGETS = 'true';

      // 1. Non-standard port 8432 without admin setting -> rejected
      const resNonStandard = await testConnectorSource(
        'postgres',
        {},
        {
          host: 'db.example.com',
          port: 8432,
          user: 'postgres',
          password: 'password',
        }
      );
      expect(resNonStandard.success).toBe(false);
      expect(resNonStandard.message).toContain('Only standard PostgreSQL ports (5432, 5433, 6432, 6543) are allowed');

      // 2. Standard ports 5432, 5433, 6432, 6543 allowed by default
      (PgClient as jest.Mock).mockImplementation(() => ({
        connect: jest.fn().mockResolvedValue(undefined),
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [{ version: 'PostgreSQL 16' }] })
          .mockResolvedValueOnce({ rows: [{ has_usage: true }] })
          .mockResolvedValueOnce({ rows: [{ table_count: 5 }] }),
        end: jest.fn().mockResolvedValue(undefined),
      }));

      for (const stdPort of [5432, 5433, 6432, 6543]) {
        const resStd = await testConnectorSource(
          'postgres',
          {},
          {
            host: 'db.example.com',
            port: stdPort,
            user: 'postgres',
            password: 'password',
          }
        );
        expect(resStd.success).toBe(true);
      }

      // 3. Custom port 8432 with non-admin (isAdmin: false) -> rejected
      const resNonAdmin = await testConnectorSource(
        'postgres',
        { allowCustomPort: true },
        {
          host: 'db.example.com',
          port: 8432,
          user: 'postgres',
          password: 'password',
        },
        false // non-admin
      );
      expect(resNonAdmin.success).toBe(false);
      expect(resNonAdmin.message).toContain('not permitted by default');

      // 4. Custom port 8432 WITH explicit admin setting allowCustomPort (isAdmin: true) -> allowed
      const resCustomAllowed = await testConnectorSource(
        'postgres',
        { allowCustomPort: true },
        {
          host: 'db.example.com',
          port: 8432,
          user: 'postgres',
          password: 'password',
        },
        true // admin
      );
      expect(resCustomAllowed.success).toBe(true);

      // 5. Privileged port (22) and restricted port (6379) rejected even with allowCustomPort
      const resSsh = await testConnectorSource(
        'postgres',
        { allowCustomPort: true },
        {
          host: 'db.example.com',
          port: 22,
          user: 'postgres',
          password: 'password',
        },
        true
      );
      expect(resSsh.success).toBe(false);
      expect(resSsh.message).toContain('privileged system port (1-1023) or restricted service port');

      const resRedis = await testConnectorSource(
        'postgres',
        { allowCustomPort: true },
        {
          host: 'db.example.com',
          port: 6379,
          user: 'postgres',
          password: 'password',
        },
        true
      );
      expect(resRedis.success).toBe(false);
      expect(resRedis.message).toContain('privileged system port (1-1023) or restricted service port');
    });

    it('rejects custom S3 endpoint targeting private network when private targets are disallowed', async () => {
      process.env.ALLOW_PRIVATE_NETWORK_TARGETS = 'false';

      const res = await testConnectorSource(
        's3',
        {
          bucketName: 'test-bucket',
          endpoint: 'http://169.254.169.254/s3',
        },
        {
          accessKeyId: 'AKIAEXAMPLE',
          secretAccessKey: 'secret',
        }
      );

      expect(res.success).toBe(false);
      expect(res.message).toContain('SSRF validation failed');
    });
  });

  describe('Slack Connection Test', () => {
    const FAKE_SLACK_TOKEN = 'xoxb-fake-placeholder-test-bot-token-99999';

    it('returns error if botToken is missing', async () => {
      const res = await testConnectorSource('slack', {}, {});
      expect(res.success).toBe(false);
      expect(res.message).toContain('Token is required');
    });

    it('returns error if botToken does not start with xoxb-', async () => {
      const res = await testConnectorSource('slack', {}, { botToken: 'invalid-token-123' });
      expect(res.success).toBe(false);
      expect(res.message).toContain("must begin with \"xoxb-\"");
    });

    it('returns success with channel count when auth succeeds and channels exist', async () => {
      mockSlackAuthTest.mockResolvedValueOnce({
        ok: true,
        team: 'Test Workspace',
        user_id: 'U12345',
      });
      mockSlackConversationsList.mockResolvedValueOnce({
        ok: true,
        channels: [{ id: 'C1', name: 'general', is_member: true }],
      });

      const res = await testConnectorSource('slack', {}, { botToken: FAKE_SLACK_TOKEN });
      expect(res.success).toBe(true);
      expect(res.warning).toBe(false);
      expect(res.message).toContain('Successfully connected to Slack workspace "Test Workspace"');
      expect(res.details?.channelCount).toBe(1);
    });

    it('returns amber warning when public channels exist but bot is in none', async () => {
      mockSlackAuthTest.mockResolvedValueOnce({
        ok: true,
        team: 'Test Workspace',
        user_id: 'U12345',
      });
      mockSlackConversationsList.mockResolvedValueOnce({
        ok: true,
        channels: [
          { id: 'C1', name: 'general', is_member: false },
          { id: 'C2', name: 'random', is_member: false },
        ],
      });

      const res = await testConnectorSource('slack', {}, { botToken: FAKE_SLACK_TOKEN });
      expect(res.success).toBe(true);
      expect(res.warning).toBe(true);
      expect(res.message).toBe(
        'Connected, but the bot is not in any channel. Invite it with /invite @appname in the channels you want scanned.'
      );
      expect(res.details?.channelCount).toBe(0);
    });

    it('returns warning state when 0 readable channels found', async () => {
      mockSlackAuthTest.mockResolvedValueOnce({
        ok: true,
        team: 'Test Workspace',
        user_id: 'U12345',
      });
      mockSlackConversationsList.mockResolvedValueOnce({
        ok: true,
        channels: [],
      });

      const res = await testConnectorSource('slack', {}, { botToken: FAKE_SLACK_TOKEN });
      expect(res.success).toBe(true);
      expect(res.warning).toBe(true);
      expect(res.message).toContain('0 readable channels were found');
    });

    it('handles missing_scope error with actionable message', async () => {
      mockSlackAuthTest.mockResolvedValueOnce({
        ok: true,
        team: 'Test Workspace',
      });
      mockSlackConversationsList.mockRejectedValueOnce({
        data: { error: 'missing_scope', needed: 'channels:read' },
      });

      const res = await testConnectorSource('slack', {}, { botToken: FAKE_SLACK_TOKEN });
      expect(res.success).toBe(false);
      expect(res.message).toContain('channels:read');
    });
  });
});

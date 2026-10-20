import { testConnectorSource } from '../../services/connectorTest.service';
import { S3Client } from '@aws-sdk/client-s3';
import { google } from 'googleapis';
import { Client as PgClient } from 'pg';

jest.mock('@aws-sdk/client-s3');
jest.mock('googleapis');
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

    it('normalizes private key and returns success when API responds', async () => {
      const mockList = jest.fn().mockResolvedValueOnce({
        data: { files: [{ id: '1', name: 'report.pdf' }] },
      });
      (google.drive as jest.Mock).mockReturnValue({
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
      expect(res.message).toContain('Successfully connected to Google Drive API');
    });

    it('returns friendly error on invalid_grant', async () => {
      const mockList = jest.fn().mockRejectedValueOnce(new Error('invalid_grant: Invalid JWT Signature'));
      (google.drive as jest.Mock).mockReturnValue({
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
  });
});

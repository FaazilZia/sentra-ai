jest.mock('../../config/db', () => ({
  __esModule: true,
  default: {
    connectors: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn().mockResolvedValue({ id: 'conn-1' }),
      delete: jest.fn(),
    },
    interception_logs: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@aws-sdk/client-s3');
jest.mock('googleapis');
jest.mock('pg');

import prisma from '../../config/db';
import { processConnectorScan } from '../../services/queue.service';
import { encryptCredentials } from '../../utils/credentialHelper';
import { S3Client } from '@aws-sdk/client-s3';
import { google } from 'googleapis';
import { Client as PgClient } from 'pg';

describe('Connector Readable Error Handling', () => {
  const orgId = 'org-err-1';
  const connectorId = 'conn-err-1';

  beforeEach(() => {
    process.env.ALLOW_PRIVATE_NETWORK_TARGETS = 'true';
    jest.clearAllMocks();
  });

  it('records human-readable error when S3 scan fails due to AccessDenied', async () => {
    const creds = encryptCredentials({
      accessKeyId: 'bad-key',
      secretAccessKey: 'bad-secret',
      region: 'us-east-1',
      bucketName: 'locked-bucket',
    });

    (prisma.connectors.findUnique as jest.Mock).mockResolvedValue({
      id: connectorId,
      name: 'Restricted S3',
      type: 's3',
      organizationId: orgId,
      credentials: creds,
      health_score: 100,
      daily_cost_total: 0,
      scan_policy: {},
    });

    (S3Client as jest.Mock).mockImplementation(() => ({
      send: jest.fn().mockRejectedValue(new Error('AccessDenied: User is not authorized to perform: s3:ListBucket')),
    }));

    await processConnectorScan('s3', connectorId);

    expect(prisma.connectors.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: connectorId },
      data: expect.objectContaining({
        status: 'error',
        last_error: 'Access Denied: Please verify permissions and credential scopes.',
        last_scan_reason: expect.objectContaining({
          error: 'Access Denied: Please verify permissions and credential scopes.',
        }),
      }),
    }));
  });

  it('records human-readable error when PostgreSQL connection fails due to authentication error', async () => {
    const creds = encryptCredentials({
      host: 'db.example.com',
      port: 5432,
      user: 'wrong_user',
      password: 'wrong_password',
      database: 'prod_db',
    });

    (prisma.connectors.findUnique as jest.Mock).mockResolvedValue({
      id: connectorId,
      name: 'Company Postgres',
      type: 'sql',
      organizationId: orgId,
      credentials: creds,
      health_score: 100,
      daily_cost_total: 0,
      scan_policy: {},
    });

    (PgClient as jest.Mock).mockImplementation(() => ({
      connect: jest.fn().mockRejectedValue(new Error('password authentication failed for user "wrong_user"')),
      end: jest.fn(),
    }));

    await processConnectorScan('sql', connectorId);

    expect(prisma.connectors.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: connectorId },
      data: expect.objectContaining({
        status: 'error',
        last_error: 'Database authentication failed: Invalid username or password.',
      }),
    }));
  });

  it('records human-readable error when Google Drive fails due to invalid_grant', async () => {
    const creds = encryptCredentials({
      client_email: 'service@account.iam.gserviceaccount.com',
      private_key: '-----BEGIN RSA PRIVATE KEY-----\nMIIE...',
    });

    (prisma.connectors.findUnique as jest.Mock).mockResolvedValue({
      id: connectorId,
      name: 'Workspace Drive',
      type: 'gdrive',
      organizationId: orgId,
      credentials: creds,
      health_score: 100,
      daily_cost_total: 0,
      scan_policy: {},
    });

    (google.drive as jest.Mock).mockReturnValue({
      files: {
        list: jest.fn().mockRejectedValue(new Error('invalid_grant: Invalid JWT Signature.')),
      },
    });

    await processConnectorScan('gdrive', connectorId);

    expect(prisma.connectors.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: connectorId },
      data: expect.objectContaining({
        status: 'error',
        last_error: 'Google Drive authentication failed: Invalid service account private key or client email.',
      }),
    }));
  });

  it('records SSRF error when PostgreSQL targets loopback/private host with protection active', async () => {
    process.env.ALLOW_PRIVATE_NETWORK_TARGETS = 'false';

    const creds = encryptCredentials({
      host: '127.0.0.1',
      port: 5432,
      user: 'postgres',
      password: 'password',
      database: 'prod_db',
    });

    (prisma.connectors.findUnique as jest.Mock).mockResolvedValue({
      id: connectorId,
      name: 'Local DB',
      type: 'postgres',
      organizationId: orgId,
      credentials: creds,
      health_score: 100,
      daily_cost_total: 0,
      scan_policy: {},
    });

    await processConnectorScan('postgres', connectorId);

    expect(prisma.connectors.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: connectorId },
      data: expect.objectContaining({
        status: 'error',
        last_error: expect.stringContaining('SSRF Validation Error'),
      }),
    }));
  });
});

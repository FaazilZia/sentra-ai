import { processConnectorScan } from '../services/queue.service';
import prisma from '../config/db';
import { S3Client } from '@aws-sdk/client-s3';
import { google } from 'googleapis';
import { Client as PgClient } from 'pg';
import { decrypt } from '../utils/encryption';

jest.mock('../config/db', () => ({
  connectors: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  interception_logs: {
    create: jest.fn(),
  },
}));

jest.mock('../server', () => ({
  io: {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  },
}));

jest.mock('@aws-sdk/client-s3');
jest.mock('googleapis');
jest.mock('pg');
jest.mock('../utils/encryption');

describe('Connector Scanning Logic', () => {
  const orgId = 'test-org-123';
  const connectorId = 'conn-123';
  const mockConnector = {
    id: connectorId,
    name: 'Test S3',
    type: 's3',
    organizationId: orgId,
    config: { region: 'us-east-1' },
    credentials: 'encrypted-creds',
    health_score: 100,
    daily_cost_total: 0,
    total_api_calls: 0,
    total_data_scanned: BigInt(0),
    scan_policy: { maxDailyCost: 10 },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (decrypt as jest.Mock).mockReturnValue(JSON.stringify({
      accessKeyId: 'ak',
      secretAccessKey: 'sk',
      region: 'us-east-1',
      bucketName: 'test-bucket',
      client_email: 'test@service.com',
      private_key: 'test-key',
      host: 'localhost',
      port: 5432,
      user: 'user',
      password: 'pass',
      database: 'db'
    }));
  });

  it('should scan S3 and log violations when PII is found', async () => {
    (prisma.connectors.findUnique as jest.Mock).mockResolvedValue(mockConnector);
    
    const mockS3Send = jest.fn()
      .mockResolvedValueOnce({ // ListObjectsV2
        Contents: [{ Key: 'test-file.txt' }]
      })
      .mockResolvedValueOnce({ // GetObject
        Body: {
          transformToString: jest.fn().mockResolvedValue('My email is test@example.com')
        }
      });

    (S3Client as jest.Mock).mockImplementation(() => ({
      send: mockS3Send
    }));

    await processConnectorScan('s3', connectorId);

    expect(prisma.interception_logs.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        reason: expect.stringContaining('detected sensitive pattern: EMAIL'),
        metadata: expect.objectContaining({ violationType: 'EMAIL', fileKey: 'test-file.txt' })
      })
    }));

    expect(prisma.connectors.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: connectorId },
      data: expect.objectContaining({
        status: 'active',
        health_score: 90 // 100 - 10
      })
    }));
  });

  it('should scan GDrive and log violations', async () => {
    (prisma.connectors.findUnique as jest.Mock).mockResolvedValue({ ...mockConnector, type: 'gdrive' });

    const mockFilesList = jest.fn().mockResolvedValue({
      data: { files: [{ id: 'file-1', name: 'secret.txt', mimeType: 'text/plain' }] }
    });
    const mockFilesGet = jest.fn().mockResolvedValue({
      data: 'SSN is 123-45-6789'
    });

    (google.drive as any).mockReturnValue({
      files: {
        list: mockFilesList,
        get: mockFilesGet,
      }
    });

    await processConnectorScan('gdrive', connectorId);

    expect(prisma.interception_logs.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        reason: expect.stringContaining('detected sensitive pattern: SSN')
      })
    }));
  });

  it('should scan SQL and log violations', async () => {
    (prisma.connectors.findUnique as jest.Mock).mockResolvedValue({ ...mockConnector, type: 'sql' });

    const mockQuery = jest.fn()
      .mockResolvedValueOnce({ rows: [{ table_name: 'users' }] }) // tables
      .mockResolvedValueOnce({ rows: [{ id: 1, email: 'admin@sentra.ai' }] }); // data

    (PgClient as any).mockImplementation(() => ({
      connect: jest.fn(),
      query: mockQuery,
      end: jest.fn(),
    }));

    await processConnectorScan('sql', connectorId);

    expect(prisma.interception_logs.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        reason: expect.stringContaining('detected sensitive pattern: EMAIL')
      })
    }));
  });

  it('should stop scan if budget is exceeded', async () => {
    (prisma.connectors.findUnique as jest.Mock).mockResolvedValue({
      ...mockConnector,
      daily_cost_total: 100,
      scan_policy: { maxDailyCost: 10 }
    });

    await processConnectorScan('s3', connectorId);

    expect(prisma.connectors.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'paused_budget' })
    }));
    expect(S3Client).not.toHaveBeenCalled();
  });
});

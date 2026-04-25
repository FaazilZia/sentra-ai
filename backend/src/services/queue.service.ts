import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { google } from 'googleapis';
import { Client as PgClient } from 'pg';
import logger from '../utils/logger';
import prisma from '../config/db';
import { logActivity } from './policy.service';
import { decrypt } from '../utils/encryption';
import { SENSITIVE_PATTERNS } from './riskEngine';

const REDIS_URL = process.env.REDIS_URL;

let connection: IORedis | undefined;
if (REDIS_URL) {
  connection = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
  });
  connection.on('error', (err) => {
    logger.error('Redis Connection Error:', err);
  });
}

export const activityQueue = connection ? new Queue('activity-logs', { connection }) : null;
export const connectorQueue = connection ? new Queue('connector-scans', { connection }) : null;

/**
 * Worker to process activity logs asynchronously.
 */
if (connection) {
  const activityWorker = new Worker(
    'activity-logs',
    async (job) => {
      try {
        const { data } = job;
        await logActivity(data);
      } catch (error) {
        logger.error('Worker Error:', error);
        throw error;
      }
    },
    { connection }
  );

  activityWorker.on('completed', (job) => {
    logger.info(`Log Job ${job.id} completed`);
  });

  activityWorker.on('failed', (job, err) => {
    logger.error(`Log Job ${job?.id} failed:`, err);
  });
}

export const enqueueLog = async (data: any) => {
  // If Redis queue is available, delegate entirely to the worker.
  // The worker calls logActivity() — do NOT call it here too.
  if (activityQueue) {
    try {
      await activityQueue.add('log', data, {
        removeOnComplete: true,
        removeOnFail: 1000,
      });
      return; // worker handles the write — exit here
    } catch (error) {
      logger.warn('BullMQ enqueue failed, falling back to sync logging:', error);
      // Fall through to direct write below
    }
  }

  // Redis unavailable or enqueue failed — write synchronously
  try {
    await logActivity(data);
  } catch (error) {
    logger.error('Critical: sync log write also failed:', error);
  }
};

// --- Scheduled Data Retention (Audit Compliance) ---
export const retentionQueue = connection ? new Queue('data-retention', { connection }) : null;

if (connection) {
  const retentionWorker = new Worker(
    'data-retention',
    async (job) => {
      try {
        const { name } = job;

        if (name === 'daily-budget-reset') {
          const resetCount = await prisma.connectors.updateMany({
            data: { daily_cost_total: 0, daily_scan_count: 0 }
          });
          logger.info(`Daily Budget Reset: Successfully cleared counters for ${resetCount.count} connectors.`);
          return;
        }

        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const deletedAlerts = await (prisma as any).alerts.deleteMany({
          where: { created_at: { lt: ninetyDaysAgo } }
        });

        const deletedLogs = await (prisma as any).interception_logs.deleteMany({
          where: { timestamp: { lt: ninetyDaysAgo } }
        });

        logger.info(`Data Retention Cleanup: Deleted ${deletedAlerts.count} alerts and ${deletedLogs.count} interception logs older than 90 days.`);
      } catch (error) {
        logger.error('Retention Worker Error:', error);
      }
    },
    { connection }
  );

  const connectorWorker = new Worker(
    'connector-scans',
    async (job) => {
      const { type, connectorId } = job.data;
      await processConnectorScan(type, connectorId);
    },
    { connection }
  );
}

export async function processConnectorScan(type: string, connectorId: string) {
  try {
    const connector = await prisma.connectors.findUnique({ where: { id: connectorId } });
    if (!connector) return;

    // 0. Budget & Status Check
    const scanPolicy = (connector.scan_policy as any) || {};
    if (scanPolicy.maxDailyCost && connector.daily_cost_total >= scanPolicy.maxDailyCost) {
      logger.warn(`Budget exceeded for connector ${connector.name}. Skipping scan.`);
      await prisma.connectors.update({
        where: { id: connectorId },
        data: { status: 'paused_budget', last_scan_at: new Date().toISOString() }
      });
      return;
    }

    // 1. Decrypt Credentials
    let creds: any;
    try {
      const encryptedCreds = (connector as any).credentials || (connector.config as any).credentials;
      if (!encryptedCreds) throw new Error('Missing credentials');
      creds = JSON.parse(decrypt(encryptedCreds));
    } catch (err) {
      logger.error(`Decryption failed for connector ${connector.id}:`, err);
      await prisma.connectors.update({
        where: { id: connectorId },
        data: { status: 'error', health_score: 0, last_scan_at: new Date().toISOString() }
      });
      return;
    }

    logger.info(`Worker: Starting real scan for ${connector.name} (${type})`);
    let violations = 0;
    let apiCalls = 0;
    let bytesScanned = 0;

    // --- S3 SCAN LOGIC ---
    if (type === 's3') {
      const { accessKeyId, secretAccessKey, region, bucketName } = creds;
      const s3 = new S3Client({
        region: region || 'us-east-1',
        credentials: { accessKeyId, secretAccessKey }
      });

      const listCommand = new ListObjectsV2Command({ Bucket: bucketName, MaxKeys: 20 });
      const { Contents } = await s3.send(listCommand);
      apiCalls++;

      if (Contents) {
        for (const obj of Contents) {
          if (!obj.Key) continue;
          const getCommand = new GetObjectCommand({
            Bucket: bucketName,
            Key: obj.Key,
            Range: 'bytes=0-10240' // Limit to first 10KB
          });
          const response = await s3.send(getCommand);
          apiCalls++;
          const content = await response.Body?.transformToString();
          
          if (content) {
            bytesScanned += Buffer.byteLength(content);
            const found = await performPIIScan(content, { 
              connectorId, 
              type: 's3', 
              fileKey: obj.Key, 
              organizationId: connector.organizationId 
            });
            violations += found;
          }
        }
      }
    }

    // --- GDRIVE SCAN LOGIC ---
    else if (type === 'gdrive') {
      const { client_email, private_key, driveScope } = creds;
      const auth = new (google.auth.JWT as any)(
        client_email,
        null,
        (private_key as string || '').replace(/\\n/g, '\n'),
        [driveScope || 'https://www.googleapis.com/auth/drive.readonly']
      );
      const drive = google.drive({ version: 'v3', auth });

      const res = await drive.files.list({
        pageSize: 20,
        fields: 'files(id, name, mimeType)'
      });
      apiCalls++;

      if (res.data.files) {
        for (const file of res.data.files) {
          if (!file.id) continue;
          let content = '';
          try {
            if (file.mimeType === 'application/vnd.google-apps.document') {
              const exportRes = await drive.files.export({
                fileId: file.id,
                mimeType: 'text/plain'
              });
              content = typeof exportRes.data === 'string' ? exportRes.data : JSON.stringify(exportRes.data);
            } else {
              const getRes = await drive.files.get({
                fileId: file.id,
                alt: 'media'
              });
              content = typeof getRes.data === 'string' ? getRes.data : JSON.stringify(getRes.data);
            }
            apiCalls++;
          } catch (e) {
            logger.warn(`Failed to download GDrive file ${file.name}:`, e);
            continue;
          }

          if (content) {
            bytesScanned += Buffer.byteLength(content);
            const found = await performPIIScan(content.slice(0, 10240), {
              connectorId,
              type: 'gdrive',
              fileKey: file.name || file.id,
              organizationId: connector.organizationId
            });
            violations += found;
          }
        }
      }
    }

    // --- SQL SCAN LOGIC ---
    else if (type === 'sql') {
      const { host, port, user, password, database } = creds;
      const client = new PgClient({ host, port, user, password, database, ssl: { rejectUnauthorized: false } });
      
      await client.connect();
      apiCalls++;

      try {
        const tablesRes = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' LIMIT 10`);
        apiCalls++;

        for (const table of tablesRes.rows) {
          const tableName = table.table_name;
          const dataRes = await client.query(`SELECT * FROM "${tableName}" LIMIT 100`);
          apiCalls++;

          const rowData = JSON.stringify(dataRes.rows);
          bytesScanned += Buffer.byteLength(rowData);
          const found = await performPIIScan(rowData, {
            connectorId,
            type: 'sql',
            fileKey: `table:${tableName}`,
            organizationId: connector.organizationId
          });
          violations += found;
        }
      } finally {
        await client.end();
      }
    }

    // 3. Final Updates
    const scanCost = apiCalls * 0.001; // Base cost estimate per API call
    await prisma.connectors.update({
      where: { id: connectorId },
      data: {
        last_scan_at: new Date().toISOString(),
        daily_scan_count: { increment: 1 },
        daily_cost_total: { increment: scanCost },
        total_api_calls: { increment: apiCalls },
        total_data_scanned: { increment: BigInt(bytesScanned) },
        health_score: violations > 0 ? Math.max(0, connector.health_score - 10) : 100,
        status: 'active',
        updated_at: new Date()
      }
    });

    logger.info(`Worker: Scan completed for ${connector.name}. Detected ${violations} violations.`);
  } catch (err) {
    logger.error(`Worker: Scan failed for ${connectorId}`, err);
    await prisma.connectors.update({
      where: { id: connectorId },
      data: { 
        status: 'error', 
        health_score: { decrement: 10 },
        last_scan_at: new Date().toISOString()
      }
    }).catch(() => {});
  }
}

async function performPIIScan(content: string, metadata: { connectorId: string, type: string, fileKey: string, organizationId: string }) {
  let violationsFound = 0;
  for (const [name, pattern] of Object.entries(SENSITIVE_PATTERNS)) {
    if (pattern.test(content)) {
      violationsFound++;
      await (prisma as any).interception_logs.create({
        data: {
          user_id: 'system_scanner',
          organizationId: metadata.organizationId,
          input_text: `Scan of ${metadata.type} source: ${metadata.fileKey}`,
          decision: 'BLOCK',
          confidence: 'High',
          reason: `Data scan detected sensitive pattern: ${name}`,
          policy_triggered: 'Data Governance Baseline',
          metadata: { 
            connector_id: metadata.connectorId, 
            violationType: name, 
            fileKey: metadata.fileKey,
            source_type: metadata.type 
          },
          timestamp: new Date()
        }
      });
    }
  }
  return violationsFound;
}

// Schedule it to run every day at midnight
export const setupScheduledJobs = async () => {
  if (!retentionQueue) {
    logger.info('Skipping background job scheduling (Redis offline)');
    return;
  }
  
  try {
    // Schedule daily budget and scan counter reset (Audit Compliance)
    await retentionQueue.add(
      'daily-budget-reset',
      {},
      { repeat: { pattern: '0 0 * * *' } }
    );

    // Schedule periodic connector discovery router (every 15 mins to check for changes)
    await connectorQueue?.add(
      'priority-router',
      { action: 'RESCHEDULE_ALL' },
      { repeat: { pattern: '*/15 * * * *' } }
    );

    logger.info('Scheduled Adaptive Connector Discovery & Budget Reset Engine');
  } catch (err) {
    logger.warn('Could not schedule background jobs', err);
  }
};

export const enqueueConnectorScan = async (type: string, connectorId: string, options: { priority?: number, reason?: string } = {}) => {
  if (!connectorQueue) return;
  
  await connectorQueue.add(
    `scan-${connectorId}-${Date.now()}`, 
    { type, connectorId, reason: options.reason || 'manual' },
    { priority: options.priority || 10 } // Higher number = Lower priority in BullMQ (default 10)
  );
};

export const triggerAnomalyScan = async (connectorId: string, reason: string) => {
  const connector = await prisma.connectors.findUnique({ where: { id: connectorId } });
  if (!connector) return;

  logger.warn(`ANOMALY TRIGGERED for ${connector.name}: ${reason}`);
  await enqueueConnectorScan(connector.type, connectorId, { priority: 1, reason: `anomaly:${reason}` });
};

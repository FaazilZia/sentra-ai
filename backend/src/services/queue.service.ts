import { Queue, Worker } from 'bullmq';
import type IORedisClass from 'ioredis';
import * as IORedisModule from 'ioredis';
const IORedis = (IORedisModule.default || IORedisModule) as any;
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { google } from 'googleapis';
import { Client as PgClient } from 'pg';
import logger from '../utils/logger';
import prisma from '../config/db';
import { logActivity } from './policy.service';
import { decryptCredentials, normalizePrivateKey } from '../utils/credentialHelper';
import { assertSafeTarget } from '../utils/ssrfProtection';
import { RESTRICTED_POSTGRES_PORTS, DEFAULT_ALLOWED_POSTGRES_PORTS, validatePostgresPort } from './connectorTest.service';
import { SENSITIVE_PATTERNS } from './riskEngine';
import { buildRedisOptions, getRedisUrl } from '../config/redis';
import { PostMarketMonitoringService } from './postMarketMonitoring.service';

const REDIS_URL = getRedisUrl();

let connection: IORedisClass | undefined;
if (REDIS_URL) {
  connection = new IORedis(REDIS_URL, buildRedisOptions({
    maxRetriesPerRequest: null,
    enableOfflineQueue: true,
  }));
  if (connection) {
    connection.on('error', (err) => {
      logger.error('Redis Connection Error:', err);
    });
  }
}

export const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 2000 },
  removeOnComplete: { count: 100 },
  removeOnFail: false,
};

export const activityQueue = connection ? new Queue('activity-logs', { connection, defaultJobOptions }) : null;
export const connectorQueue = connection ? new Queue('connector-scans', { connection, defaultJobOptions }) : null;
export const driftQueue = connection ? new Queue('drift-scans', { connection, defaultJobOptions }) : null;
export const evaluationQueue = connection ? new Queue('evaluation-runs', { connection, defaultJobOptions }) : null;
export const automationsQueue = connection ? new Queue('automations', { connection, defaultJobOptions }) : null;
export const intakeLLMQueue = connection ? new Queue('intake-llm', { connection, defaultJobOptions }) : null;
export const alertQueue = connection ? new Queue('alerts', { connection, defaultJobOptions }) : null;
export const governanceQueue = connection ? new Queue('governance-seeding', { connection, defaultJobOptions }) : null;

if (activityQueue) activityQueue.on('error', (err) => logger.warn('[BULLMQ] activityQueue connection issue:', err));
if (connectorQueue) connectorQueue.on('error', (err) => logger.warn('[BULLMQ] connectorQueue connection issue:', err));
if (driftQueue) driftQueue.on('error', (err) => logger.warn('[BULLMQ] driftQueue connection issue:', err));
if (evaluationQueue) evaluationQueue.on('error', (err) => logger.warn('[BULLMQ] evaluationQueue connection issue:', err));
if (automationsQueue) automationsQueue.on('error', (err) => logger.warn('[BULLMQ] automationsQueue connection issue:', err));
if (intakeLLMQueue) intakeLLMQueue.on('error', (err) => logger.warn('[BULLMQ] intakeLLMQueue connection issue:', err));
if (governanceQueue) governanceQueue.on('error', (err) => logger.warn('[BULLMQ] governanceQueue connection issue:', err));

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
    logger.error({
      jobId: job?.id,
      queueName: 'activity-logs',
      errorMessage: err.message,
      errorStack: err.stack,
      jobData: job?.data,
    }, `Job ${job?.id} in queue 'activity-logs' failed: ${err.message}`);
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

export const enqueueGovernanceSeed = async (organizationId: string): Promise<boolean> => {
  if (governanceQueue) {
    try {
      await governanceQueue.add('seed-governance', { organizationId }, {
        jobId: `seed-gov-${organizationId}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: false,
      });
      logger.info(`[BULLMQ] Successfully enqueued governance seeding job for org ${organizationId}`);
      return true;
    } catch (error) {
      logger.warn(`[BULLMQ] Failed to enqueue governance seed for org ${organizationId}:`, error);
      return false;
    }
  }
  return false;
};

// --- Scheduled Data Retention (Audit Compliance) ---
export const retentionQueue = connection ? new Queue('data-retention', { connection, defaultJobOptions }) : null;

if (retentionQueue) retentionQueue.on('error', (err) => logger.warn('[BULLMQ] retentionQueue connection issue:', err));

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

        const deletedAlerts = await prisma.alerts.deleteMany({
          where: { created_at: { lt: ninetyDaysAgo } }
        });

        const deletedLogs = await prisma.interception_logs.deleteMany({
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

  const postMarketWorker = new Worker(
    'post-market-monitoring',
    async (job) => {
      const { organizationId } = job.data;
      if (!organizationId) return;
      try {
        logger.info(`[BULLMQ] Processing post-market-monitoring check for organization: ${organizationId}`);
        const report = await PostMarketMonitoringService.generateMonitoringReport(organizationId);
        const driftAlerts = report.metrics.driftAlertsCount;
        const openIncidents = report.metrics.openIncidents;
        if (driftAlerts > 5 || openIncidents > 3) {
          await prisma.alerts.create({
            data: {
              organizationId,
              type: 'POST_MARKET_MONITORING',
              message: `Post-market monitoring check detected high compliance risk. Active drift events: ${driftAlerts} (threshold: 5), unresolved incidents: ${openIncidents} (threshold: 3).`,
              severity: 'critical',
              is_read: false
            }
          });
          logger.warn(`[BULLMQ] CRITICAL Post-market monitoring alert created for org ${organizationId}`);
        }
      } catch (err: any) {
        logger.error(`[BULLMQ] Post-market monitoring worker error:`, err);
      }
    },
    { connection }
  );

  const automationsWorker = new Worker(
    'automations',
    async (job) => {
      const { name, data } = job;
      try {
        if (name === 'automation-execute') {
          const { automationId, triggerPayload } = data;
          const { AutomationService } = require('./automation.service');
          await AutomationService.executeAutomation(automationId, triggerPayload);
        } else if (name === 'scheduled-daily-automations') {
          const { AutomationService } = require('./automation.service');
          const orgs = await prisma.organizations.findMany({ select: { id: true } });
          for (const org of orgs) {
            await AutomationService.triggerByEvent(org.id, 'SCHEDULED_DAILY', { message: 'Daily scheduled automation trigger' });
          }
        } else if (name === 'scheduled-weekly-automations') {
          const { AutomationService } = require('./automation.service');
          const orgs = await prisma.organizations.findMany({ select: { id: true } });
          for (const org of orgs) {
            await AutomationService.triggerByEvent(org.id, 'SCHEDULED_WEEKLY', { message: 'Weekly scheduled automation trigger' });
          }
        }
      } catch (err) {
        logger.error(`[BULLMQ] automationsWorker job ${job.id} failed:`, err);
        throw err;
      }
    },
    { connection }
  );

  const intakeLLMWorker = new Worker(
    'intake-llm',
    async (job) => {
      const { name, data } = job;
      try {
        if (name === 'intake-llm-score') {
          const { submissionId, organizationId } = data;
          const { IntakeLLMService } = require('./intakeLLM.service');
          await IntakeLLMService.scoreSubmission(submissionId, organizationId);
        }
      } catch (err) {
        logger.error(`[BULLMQ] intakeLLMWorker job ${job.id} failed:`, err);
        throw err;
      }
    },
    { connection }
  );

  const alertWorker = new Worker(
    'alerts',
    async (job) => {
      try {
        const { processAlertJob } = require('./alertPipeline.service');
        await processAlertJob(job.data);
      } catch (err) {
        logger.error(`[BULLMQ] alertWorker job ${job.id} failed:`, err);
        throw err;
      }
    },
    { connection }
  );

  const registerFailedListener = (worker: Worker, queueName: string) => {
    worker.on('failed', (job, err) => {
      logger.error({
        jobId: job?.id,
        queueName,
        errorMessage: err.message,
        errorStack: err.stack,
        jobData: job?.data,
      }, `Job ${job?.id} in queue '${queueName}' failed: ${err.message}`);
    });
  };

  registerFailedListener(retentionWorker, 'data-retention');
  registerFailedListener(connectorWorker, 'connector-scans');
  registerFailedListener(postMarketWorker, 'post-market-monitoring');
  registerFailedListener(automationsWorker, 'automations');
  registerFailedListener(intakeLLMWorker, 'intake-llm');
  registerFailedListener(alertWorker, 'alerts');
}

async function scanS3Source(connector: any, creds: any): Promise<{ violations: number; apiCalls: number; bytesScanned: number }> {
  let violations = 0;
  let apiCalls = 0;
  let bytesScanned = 0;

  const { accessKeyId, secretAccessKey, region, bucketName } = creds;

  // Defensive SSRF check if a custom endpoint parameter was injected
  const customEndpoint = (connector.config as any)?.endpoint || creds.endpoint;
  if (customEndpoint) {
    const parsedUrl = new URL(String(customEndpoint));
    await assertSafeTarget(parsedUrl.hostname);
  }

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
          connectorId: connector.id, 
          type: 's3', 
          fileKey: obj.Key, 
          organizationId: connector.organizationId 
        });
        violations += found;
      }
    }
  }

  return { violations, apiCalls, bytesScanned };
}

async function scanGDriveSource(connector: any, creds: any): Promise<{ violations: number; apiCalls: number; bytesScanned: number }> {
  let violations = 0;
  let apiCalls = 0;
  let bytesScanned = 0;

  const { client_email, private_key, driveScope } = creds;

  // Defensive SSRF check if a custom endpoint parameter was injected
  const customEndpoint = (connector.config as any)?.endpoint || creds.endpoint;
  if (customEndpoint) {
    const parsedUrl = new URL(String(customEndpoint));
    await assertSafeTarget(parsedUrl.hostname);
  }

  const normalizedKey = normalizePrivateKey((private_key as string) || '');
  const auth = new (google.auth.JWT as any)(
    client_email,
    null,
    normalizedKey,
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
          connectorId: connector.id,
          type: 'gdrive',
          fileKey: file.name || file.id,
          organizationId: connector.organizationId
        });
        violations += found;
      }
    }
  }

  return { violations, apiCalls, bytesScanned };
}

/**
 * Executes async tasks over an array of items with bounded concurrency to prevent
 * database connection pool exhaustion.
 */
async function runWithConcurrencyLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return [];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += limit) {
    chunks.push(items.slice(i, i + limit));
  }
  const results: R[] = [];
  return chunks.reduce(
    (chain, chunk) =>
      chain
        .then(() => Promise.all(chunk.map(fn)))
        .then(chunkResults => {
          results.push(...chunkResults);
          return results;
        }),
    Promise.resolve(results)
  );
}

async function scanSqlSource(connector: any, creds: any): Promise<{ violations: number; apiCalls: number; bytesScanned: number }> {
  let violations = 0;
  let apiCalls = 0;
  let bytesScanned = 0;

  const { host, port, user, password, database } = creds;
  const rawSchema = (connector.config as any)?.schema || creds.schema || 'public';
  const schema = /^\w+$/.test(rawSchema) ? rawSchema : 'public';
  const useSsl = (connector.config as any)?.ssl !== false && creds.ssl !== false;
  const allowSelfSigned = Boolean((connector.config as any)?.allowSelfSigned || creds.allowSelfSigned);

  const HOST_PATTERN = /^[a-zA-Z0-9_.-]+$/;
  if (!host || !HOST_PATTERN.test(host)) {
    throw new Error('Invalid database host format.');
  }

  const allowCustomPort = Boolean(
    process.env.ALLOW_CUSTOM_DB_PORTS === 'true' ||
    (connector.config as any)?.allowCustomPort ||
    creds.allowCustomPort
  );

  const portValidation = validatePostgresPort(port || 5432, allowCustomPort);
  if (!portValidation.valid) {
    throw new Error(portValidation.error || 'Invalid port.');
  }
  const parsedPort = portValidation.port;

  // SSRF Protection: verify host is not private/internal before connecting and pin to resolved IP
  const safeIp = await assertSafeTarget(host);
  if (!/^[a-zA-Z0-9_.:]+$/.test(safeIp)) {
    throw new Error('Invalid resolved target IP address.');
  }

  const client = new PgClient({
    host: safeIp,
    port: parsedPort,
    user,
    password,
    database,
    ssl: useSsl ? { rejectUnauthorized: !allowSelfSigned, servername: host } : undefined,
    connectionTimeoutMillis: 10000,
  });
  
  await client.connect();
  apiCalls++;

  try {
    // Metadata only: query table and column names from information_schema (never customer row data)
    const columnsRes = await client.query(
      `SELECT table_name, column_name, data_type 
       FROM information_schema.columns 
       WHERE table_schema = $1 
       ORDER BY table_name, ordinal_position 
       LIMIT 500`,
      [schema]
    );
    apiCalls++;

    const SENSITIVE_COLUMN_PATTERNS: Record<string, RegExp> = {
      EMAIL: /\bemail\b|\be_mail\b/i,
      SSN: /\bssn\b|\bsocial_security\b/i,
      CREDIT_CARD: /\bcredit_card\b|\bcard_number\b|\bcc_num\b/i,
      PASSWORD: /\bpassword\b|\bpasswd\b|\bpwd\b/i,
    };

    const scanItems = columnsRes.rows.map((col) => {
      const { table_name, column_name, data_type } = col;
      const metadataDesc = `table:${table_name}.column:${column_name} (${data_type})`;
      bytesScanned += Buffer.byteLength(metadataDesc);

      const matchedPatterns: string[] = [];
      for (const [name, pattern] of Object.entries(SENSITIVE_COLUMN_PATTERNS)) {
        if (pattern.test(column_name)) {
          matchedPatterns.push(name);
        }
      }

      return { table_name, column_name, metadataDesc, matchedPatterns };
    });

    // Bounded concurrency execution (max 5 concurrent) prevents DB pool exhaustion
    const piiResults = await runWithConcurrencyLimit(scanItems, 5, item =>
      performPIIScan(item.metadataDesc, {
        connectorId: connector.id,
        type: 'postgres',
        fileKey: `${schema}.${item.table_name}.${item.column_name}`,
        organizationId: connector.organizationId,
      })
    );
    const piiViolations = piiResults.reduce((acc, curr) => acc + curr, 0);

    const patternItems: Array<{ item: typeof scanItems[0]; name: string }> = [];
    for (const item of scanItems) {
      for (const name of item.matchedPatterns) {
        patternItems.push({ item, name });
      }
    }
    const patternViolations = patternItems.length;

    if (patternItems.length > 0) {
      await runWithConcurrencyLimit(patternItems, 5, async ({ item, name }) => {
        await prisma.interception_logs.create({
          data: {
            user_id: 'system_scanner',
            organizationId: connector.organizationId,
            input_text: `Scan of postgres metadata: ${schema}.${item.table_name}.${item.column_name}`,
            decision: 'BLOCK',
            confidence: 'High',
            reason: `Data scan detected sensitive pattern: ${name}`,
            policy_triggered: 'Data Governance Baseline',
            metadata: {
              connector_id: connector.id,
              violationType: name,
              fileKey: `${schema}.${item.table_name}.${item.column_name}`,
              source_type: 'postgres',
            },
            timestamp: new Date(),
          },
        });
      });
    }

    violations = piiViolations + patternViolations;
  } finally {
    await client.end().catch(() => {});
  }

  return { violations, apiCalls, bytesScanned };
}

function formatConnectorScanError(err: any): string {
  const rawMsg = err?.message || String(err);
  if (rawMsg.includes('SSRF validation failed') || rawMsg.includes('private or internal network')) {
    return 'SSRF Validation Error: Target host is in a private or restricted network address.';
  }
  if (rawMsg.includes('AccessDenied') || rawMsg.includes('Forbidden') || err?.name === 'AccessDenied') {
    return 'Access Denied: Please verify permissions and credential scopes.';
  }
  if (rawMsg.includes('NoSuchBucket')) {
    return 'Specified S3 bucket does not exist or is in a different region.';
  }
  if (rawMsg.includes('ECONNREFUSED') || rawMsg.includes('ETIMEDOUT') || rawMsg.includes('ENOTFOUND')) {
    return 'Connection refused: Host unreachable. Check firewall, network rules, or host address.';
  }
  if (rawMsg.includes('password authentication failed') || err?.code === '28P01') {
    return 'Database authentication failed: Invalid username or password.';
  }
  if (rawMsg.includes('database') && rawMsg.includes('does not exist')) {
    return 'Database not found: Specified database does not exist on the target server.';
  }
  if (rawMsg.includes('invalid_grant')) {
    return 'Google Drive authentication failed: Invalid service account private key or client email.';
  }
  return `Scan failed: ${rawMsg}`;
}

async function executeSourceScan(type: string, connector: any, creds: any) {
  if (type === 's3') {
    return await scanS3Source(connector, creds);
  }
  if (type === 'gdrive') {
    return await scanGDriveSource(connector, creds);
  }
  if (type === 'sql' || type === 'postgres') {
    return await scanSqlSource(connector, creds);
  }
  return { violations: 0, apiCalls: 0, bytesScanned: 0 };
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
      const encryptedCreds = (connector as any).credentials || (connector.config as any)?.credentials;
      if (!encryptedCreds) throw new Error('Missing credentials. Please configure authentication keys.');
      creds = decryptCredentials(encryptedCreds);
    } catch (err: any) {
      const humanError = err.message || 'Decryption failed for connector credentials.';
      logger.error(`Decryption failed for connector ${connector.id}:`, err);
      await prisma.connectors.update({
        where: { id: connectorId },
        data: {
          status: 'error',
          health_score: 0,
          last_error: humanError,
          last_scan_reason: { error: humanError, at: new Date().toISOString() },
          last_scan_at: new Date().toISOString()
        }
      });
      return;
    }

    logger.info(`Worker: Starting real scan for ${connector.name} (${type})`);
    const { violations, apiCalls, bytesScanned } = await executeSourceScan(type, connector, creds);

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
        last_error: null,
        updated_at: new Date()
      }
    });

    logger.info(`Worker: Scan completed for ${connector.name}. Detected ${violations} violations.`);
  } catch (err: any) {
    const rawMsg = err.message || String(err);
    const humanError = formatConnectorScanError(err);

    logger.error(`Worker: Scan failed for ${connectorId}`, err);
    try {
      await prisma.connectors.update({
        where: { id: connectorId },
        data: { 
          status: 'error', 
          health_score: { decrement: 10 },
          last_error: humanError,
          last_scan_reason: { error: humanError, raw: rawMsg, at: new Date().toISOString() },
          last_scan_at: new Date().toISOString()
        }
      });
    } catch {
      // Ignore secondary update error
    }
  }
}

async function performPIIScan(content: string, metadata: { connectorId: string, type: string, fileKey: string, organizationId: string }) {
  let violationsFound = 0;
  for (const [name, pattern] of Object.entries(SENSITIVE_PATTERNS)) {
    if (pattern.test(content)) {
      violationsFound++;
      await prisma.interception_logs.create({
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
  if (!retentionQueue || !driftQueue) {
    logger.warn('Skipping background job scheduling (Redis offline or driftQueue unavailable)');
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

    // Schedule repeatable drift scan (every 15 mins in production, every 2 mins in development)
    const isDev = process.env.NODE_ENV === 'development';
    const driftPattern = isDev ? '*/2 * * * *' : '*/15 * * * *';
    await driftQueue?.add(
      'drift-scan',
      { action: 'drift-scan' },
      { repeat: { pattern: driftPattern } }
    );

    // Schedule baseline refresh — runs every 6 hours
    // Re-samples baselines for agents whose baseline is stale or missing
    await driftQueue?.add(
      'baseline-refresh',
      { action: 'baseline-refresh' },
      { repeat: { pattern: '0 */6 * * *' } }
    );

    // Schedule repeatable automations daily and weekly checks
    await automationsQueue?.add(
      'scheduled-daily-automations',
      {},
      { repeat: { pattern: '0 1 * * *' } }
    );

    await automationsQueue?.add(
      'scheduled-weekly-automations',
      {},
      { repeat: { pattern: '0 2 * * 0' } }
    );

    logger.info('Scheduled Adaptive Connector Discovery, Budget Reset, Drift Scanner, Baseline Refresher & Automations');
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

import { Worker, Job, Queue } from 'bullmq';
import IORedis from 'ioredis';
import logger from '../utils/logger';
import prisma from '../config/db';
import { buildRedisOptions, getRedisUrl } from '../config/redis';
import { DriftAlertService } from '../services/driftAlert.service';
import { EvaluationService } from '../services/evaluation.service';
import { DriftBaselineService } from '../services/driftBaseline.service';
import { seedOrganizationGovernance } from '../services/governanceSeed.service';
import { processConnectorScan } from '../services/queue.service';


const REDIS_URL = getRedisUrl();

let activeConnectorWorker: Worker | null = null;

export function resetConnectorWorkerForTesting(): void {
  if (activeConnectorWorker) {
    activeConnectorWorker.close().catch(() => {});
    activeConnectorWorker = null;
  }
}

export function setupConnectorWorkers(): Worker | null {
  if (activeConnectorWorker) {
    return activeConnectorWorker;
  }
  if (!REDIS_URL) {
    logger.warn('Skipping Connector Workers (Redis offline)');
    return null;
  }

  const connection = new IORedis(REDIS_URL, buildRedisOptions({
    maxRetriesPerRequest: null,
    enableOfflineQueue: true,
  }));
  connection.on('error', (err) => {
    logger.warn('Connector Worker Redis Connection Error:', err);
  });

  const worker = new Worker(
    'connector-scans',
    async (job: Job) => {
      const { action, type, connectorId, reason, trigger } = job.data;
      
      if (action === 'RESCHEDULE_ALL') {
        return await handleAdaptiveScheduling(connection);
      }

      if (!connectorId) {
        throw new Error('Invalid connector-scans job: missing connectorId');
      }

      // 1. Governance Check
      const canRun = await validateScanPolicy(connectorId, trigger);
      if (!canRun.allowed) {
        logger.warn(`Scan Policy Blocked: ${connectorId}. Reason: ${canRun.reason}`);
        return { status: 'skipped', reason: canRun.reason };
      }

      // 2. Start Timing for Health Metrics
      const startTime = Date.now();

      try {
        // 3. Log Explainability
        await prisma.connectors.update({
          where: { id: connectorId },
          data: { 
            last_scan_reason: { trigger: trigger || 'scheduled', reason: reason || 'Routine discovery', timestamp: new Date() }
          }
        });

        // 4. Shared scan execution for all connector types (s3, gdrive, sql, postgres, slack)
        const scanResult = await processConnectorScan(type, connectorId, { trigger, reason });

        // 5. Update health score
        const success = scanResult ? scanResult.success !== false : true;
        await updateConnectorHealth(connectorId, success, Date.now() - startTime);

        if (scanResult && scanResult.success === false) {
          logger.warn(`Scan for connector ${connectorId} (${type}) finished with warning/error: ${scanResult.error}`);
        }
        return scanResult;
      } catch (error) {
        logger.error(`Worker failed for job ${job.id}:`, error);
        await updateConnectorHealth(connectorId, false, Date.now() - startTime);
        throw error;
      }
    },
    { connection, concurrency: 5 }
  );

  worker.on('error', (err) => {
    logger.warn('[BULLMQ] connector-scans worker error:', err);
  });
  worker.on('failed', (job, err) => {
    logger.error(`[BULLMQ] Job ${job?.id} in connector-scans failed:`, err);
  });

  activeConnectorWorker = worker;
  return worker;
}

/**
 * Validates scan limits, costs, and intervals before execution.
 */
async function validateScanPolicy(connectorId: string, trigger: string) {
  const connector = await prisma.connectors.findUnique({ where: { id: connectorId } });
  if (!connector) return { allowed: false, reason: 'Connector not found' };

  const policy = (connector.scan_policy as any) || { maxDailyCost: 5.0, maxScansPerDay: 50 };
  
  // 1. Hard Budget Check
  if (connector.daily_cost_total >= (policy.maxDailyCost || 100)) {
    await prisma.connectors.update({ where: { id: connectorId }, data: { status: 'paused_budget' } });
    return { allowed: false, reason: 'Daily budget limit reached' };
  }

  // 2. Scan Frequency Check
  if (connector.daily_scan_count >= (policy.maxScansPerDay || 1000)) {
    return { allowed: false, reason: 'Max daily scan count reached' };
  }

  // 3. Minimum Interval Check (except for anomaly, manual, or discovery triggers)
  if (trigger !== 'anomaly' && trigger !== 'manual' && trigger !== 'discovery' && connector.last_scan_at) {
    const minInterval = (policy.minScanIntervalMinutes || 5) * 60000;
    if (Date.now() - new Date(connector.last_scan_at).getTime() < minInterval) {
      return { allowed: false, reason: 'Scan interval too short' };
    }
  }

  return { allowed: true };
}

/**
 * Calculates health score based on reliability and performance.
 */
async function updateConnectorHealth(connectorId: string, success: boolean, latency: number) {
  const connector = await prisma.connectors.findUnique({ where: { id: connectorId } });
  if (!connector) return;

  const metrics = (connector.health_metrics as any) || { success_rate: 1.0, avg_latency_ms: 0, failure_streak: 0 };
  
  // Decay logic for success rate (moving average)
  const newSuccessRate = (metrics.success_rate * 0.9) + (success ? 0.1 : 0);
  const newLatency = (metrics.avg_latency_ms * 0.9) + (latency * 0.1);
  const newStreak = success ? 0 : metrics.failure_streak + 1;

  // Health Score Calculation: Success Rate (60%) + Stability/Streak (40%)
  const healthScore = Math.max(0, Math.min(100, Math.round(
    (newSuccessRate * 60) + (Math.max(0, 40 - (newStreak * 10)))
  )));

  await prisma.connectors.update({
    where: { id: connectorId },
    data: {
      health_score: healthScore,
      health_metrics: { success_rate: newSuccessRate, avg_latency_ms: newLatency, failure_streak: newStreak },
      daily_scan_count: { increment: 1 }
    }
  });
}

/**
 * Adaptive Scheduling Logic
 */
async function handleAdaptiveScheduling(connection: IORedis) {
  const connectors = await prisma.connectors.findMany({ where: { status: { notIn: ['failed', 'paused_budget'] } } });
  const defaultJobOptions = {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 2000 },
    removeOnComplete: { count: 100 },
    removeOnFail: false,
  };
  const connectorQueue = new Queue('connector-scans', { connection, defaultJobOptions });

  for (const connector of connectors) {
    const jobName = `repeat-scan-${connector.id}`;
    const repeatableJobs = await connectorQueue.getRepeatableJobs();
    const existing = repeatableJobs.find(j => j.name === jobName);
    if (existing) await connectorQueue.removeRepeatableByKey(existing.key);

    let pattern = '0 * * * *'; 
    if (connector.priority === 'high') pattern = '*/10 * * * *';
    if (connector.priority === 'low') pattern = '0 0 * * *';

    await connectorQueue.add(
      jobName,
      { type: connector.type, connectorId: connector.id, trigger: 'scheduled', reason: `Priority: ${connector.priority}` },
      { repeat: { pattern } }
    );
  }
}

export function setupDriftWorker() {
  if (!REDIS_URL) {
    logger.warn('Skipping Drift Worker (Redis offline)');
    return;
  }

  const connection = new IORedis(REDIS_URL, buildRedisOptions({
    maxRetriesPerRequest: null,
    enableOfflineQueue: true,
  }));
  connection.on('error', (err) => {
    logger.warn('Drift Worker Redis Connection Error:', err);
  });

  const driftWorker = new Worker(
    'drift-scans',
    async (job: Job) => {
      const { action } = job.data;

      if (action === 'baseline-refresh') {
        // Re-compute stale baselines before drift scan runs
        logger.info(`[DRIFT WORKER] Running baseline refresh job ${job.id}...`);
        const activeOrgs = await prisma.organizations.findMany({
          where: { is_active: true },
        });
        for (const org of activeOrgs) {
          try {
            const count = await DriftBaselineService.refreshStaleBaselines(org.id);
            logger.info(`[DRIFT WORKER] Refreshed ${count} baselines for org ${org.name}`);
          } catch (err) {
            logger.error(`[DRIFT WORKER] Baseline refresh failed for org ${org.name}:`, err);
          }
        }
        return;
      }

      // Default: drift-scan action
      logger.info(`[DRIFT WORKER] Running drift scan background job ${job.id}...`);
      const activeOrgs = await prisma.organizations.findMany({
        where: { is_active: true }
      });
      
      for (const org of activeOrgs) {
        const lockKey = `drift-scan:lock:org:${org.id}`;
        
        // Try to acquire lock for 10 minutes (600s)
        const acquired = await connection.set(lockKey, 'locked', 'EX', 600, 'NX');
        if (!acquired) {
          logger.info(`[DRIFT WORKER] Drift scan for organization ${org.name} (${org.id}) is already running or locked. Skipping.`);
          continue;
        }

        try {
          logger.info(`[DRIFT WORKER] Triggering drift scan for active organization: ${org.name} (${org.id})`);
          await DriftAlertService.runDriftScan(org.id);
        } catch (err) {
          logger.error(`[DRIFT WORKER] Drift scan failed for organization ${org.name} (${org.id}):`, err);
        } finally {
          await connection.del(lockKey);
        }
      }
    },
    { connection, concurrency: 1 }
  );

  driftWorker.on('completed', (job) => {
    logger.info(`[DRIFT WORKER] Job ${job.id} completed successfully`);
  });

  driftWorker.on('failed', (job, err) => {
    logger.error(`[DRIFT WORKER] Job ${job?.id} failed:`, err);
  });

  driftWorker.on('error', (err) => {
    logger.warn('[BULLMQ] drift-scans worker error:', err);
  });

  return driftWorker;
}

export function setupEvaluationWorker() {
  if (!REDIS_URL) {
    logger.warn('Skipping Evaluation Worker (Redis offline)');
    return;
  }

  const connection = new IORedis(REDIS_URL, buildRedisOptions({
    maxRetriesPerRequest: null,
    enableOfflineQueue: true,
  }));
  connection.on('error', (err) => {
    logger.warn('Evaluation Worker Redis Connection Error:', err);
  });

  const evaluationWorker = new Worker(
    'evaluation-runs',
    async (job: Job) => {
      const { runId, organizationId, datasetId } = job.data;
      logger.info(`[EVALUATION WORKER] Executing evaluation run ${runId} for org ${organizationId}...`);
      await EvaluationService.executeEvaluationRun(runId, organizationId, datasetId);
    },
    { connection, concurrency: 2 }
  );

  evaluationWorker.on('completed', (job) => {
    logger.info(`[EVALUATION WORKER] Job ${job.id} completed successfully`);
  });

  evaluationWorker.on('failed', (job, err) => {
    logger.error(`[EVALUATION WORKER] Job ${job?.id} failed:`, err);
  });

  evaluationWorker.on('error', (err) => {
    logger.warn('[BULLMQ] evaluation-runs worker error:', err);
  });

  return evaluationWorker;
}

export function setupGovernanceWorker() {
  if (!REDIS_URL) {
    return null;
  }
  const connection = new IORedis(REDIS_URL, buildRedisOptions({
    maxRetriesPerRequest: null,
    enableOfflineQueue: true,
  }));
  connection.on('error', (err) => {
    logger.warn('Governance Worker Redis Connection Error:', err);
  });

  const worker = new Worker(
    'governance-seeding',
    async (job: Job) => {
      const { organizationId } = job.data;
      logger.info(`[GOVERNANCE WORKER] Processing governance seeding job for org ${organizationId}`);
      await seedOrganizationGovernance(organizationId);
      logger.info(`[GOVERNANCE WORKER] Governance seeding completed for org ${organizationId}`);
    },
    { connection }
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, queue: 'governance-seeding', err: err.message }, `Governance seed job failed: ${err.message}`);
  });

  worker.on('error', (err) => {
    logger.warn('[BULLMQ] governance-seeding worker error:', err);
  });

  return worker;
}

export async function updateConnectorTelemetry(
  connectorId: string,
  apiCalls: number,
  scanCost: number,
  scanConfidence: number,
  status: string = 'active',
  bytesScanned: bigint = BigInt(0)
) {
  const connector = await prisma.connectors.findUnique({ where: { id: connectorId } });
  if (!connector) return;

  const dataToUpdate: any = {
    last_scan_at: new Date().toISOString(),
    status,
    total_api_calls: connector.total_api_calls + apiCalls,
    estimated_cost: connector.estimated_cost + scanCost,
    daily_cost_total: connector.daily_cost_total + scanCost,
    last_confidence: scanConfidence,
  };

  if (bytesScanned > BigInt(0)) {
    dataToUpdate.total_data_scanned = connector.total_data_scanned + bytesScanned;
  }

  await prisma.connectors.update({
    where: { id: connectorId },
    data: dataToUpdate,
  });
}


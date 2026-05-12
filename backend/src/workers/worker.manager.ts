import { Worker, Job, Queue } from 'bullmq';
import IORedis from 'ioredis';
import logger from '../utils/logger';
import prisma from '../config/db';
import { processS3Scan } from './s3.worker';
import { processSqlScan } from './sql.worker';
import { processGDriveScan } from './gdrive.worker';

const REDIS_URL = process.env.REDIS_URL;

export function setupConnectorWorkers() {
  if (!REDIS_URL) {
    logger.warn('Skipping Connector Workers (Redis offline)');
    return;
  }

  const connection = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
  });

  const worker = new Worker(
    'connector-scans',
    async (job: Job) => {
      const { action, type, connectorId, reason, trigger } = job.data;
      
      if (action === 'RESCHEDULE_ALL') {
        return await handleAdaptiveScheduling(connection);
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

        // Use lowercase types to match DB field 'type'
        switch (type) {
          case 's3': await processS3Scan(connectorId); break;
          case 'sql': await processSqlScan(connectorId); break;
          case 'gdrive': await processGDriveScan(connectorId); break;
        }

        // 4. Success Health Update
        await updateConnectorHealth(connectorId, true, Date.now() - startTime);

      } catch (error) {
        logger.error(`Worker failed for job ${job.id}:`, error);
        await updateConnectorHealth(connectorId, false, Date.now() - startTime);
        throw error;
      }
    },
    { connection, concurrency: 5 }
  );

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

  // 3. Minimum Interval Check (except for anomaly triggers)
  if (trigger !== 'anomaly' && connector.last_scan_at) {
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
  const connectorQueue = new Queue('connector-scans', { connection });

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

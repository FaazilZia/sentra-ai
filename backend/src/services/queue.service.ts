import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import logger from '../utils/logger';
import prisma from '../config/db';
import { logActivity } from './policy.service';

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
  try {
    if (activityQueue) {
      await activityQueue.add('log', data, {
        removeOnComplete: true,
        removeOnFail: 1000,
      });
    }
    await logActivity(data);
  } catch (error) {
    logger.warn('Failed to enqueue log, falling back to sync logging:', error);
    await logActivity(data); // Fallback
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

import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import logger from '../utils/logger';
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
    async () => {
      try {
        const prisma = require('../config/db').default;
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
    await retentionQueue.add(
      'daily-cleanup',
      {},
      { repeat: { pattern: '0 0 * * *' } }
    );
    logger.info('Scheduled Data Retention Job (Daily)');
  } catch (err) {
    logger.warn('Could not schedule retention job', err);
  }
};

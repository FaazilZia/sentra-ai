import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import logger from '../utils/logger';
import { logActivity } from './policy.service';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const activityQueue = new Queue('activity-logs', { connection });

/**
 * Worker to process activity logs asynchronously.
 */
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

export const enqueueLog = async (data: any) => {
  try {
    await activityQueue.add('log', data, {
      removeOnComplete: true,
      removeOnFail: 1000,
    });
    await logActivity(data);
  } catch (error) {
    logger.warn('Failed to enqueue log, falling back to sync logging:', error);
    await logActivity(data); // Fallback
  }
};

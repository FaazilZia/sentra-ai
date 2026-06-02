import { Worker, Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis';
import { PostMarketMonitoringService } from '../services/postMarketMonitoring.service';
import prisma from '../config/db';
import logger from '../utils/logger';

export function startPostMarketWorker() {
  const connection = getRedisConnection();
  if (!connection) {
    logger.warn('[PostMarketWorker] Skipping start (Redis offline)');
    return null;
  }

  const defaultJobOptions = {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 2000 },
    removeOnComplete: { count: 100 },
    removeOnFail: false,
  };
  const queue = new Queue('post-market-monitoring', { connection, defaultJobOptions });

  queue.add('monthly-report-refresh', {}, {
    repeat: { pattern: '0 8 1 * *' }, // 8am on the 1st of every month
    removeOnComplete: 5,
    removeOnFail: 3,
  }).catch(err => logger.error('[PostMarket] Failed to schedule monthly job:', err));

  const worker = new Worker('post-market-monitoring', async (job) => {
    logger.info(`[PostMarketWorker] Running job: ${job.name}`);
    const orgs = await prisma.organizations.findMany({ select: { id: true } });
    for (const org of orgs) {
      try {
        await PostMarketMonitoringService.generateMonitoringReport(org.id);
        logger.info(`[PostMarketWorker] Report generated for org: ${org.id}`);
      } catch (err) {
        logger.error(`[PostMarketWorker] Failed for org ${org.id}:`, err);
      }
    }
  }, { connection });

  worker.on('failed', (job, err) => {
    logger.error({
      jobId: job?.id,
      queueName: 'post-market-monitoring',
      errorMessage: err.message,
      errorStack: err.stack,
      jobData: job?.data,
    }, `Job ${job?.id} in queue 'post-market-monitoring' failed: ${err.message}`);
  });
  return worker;
}

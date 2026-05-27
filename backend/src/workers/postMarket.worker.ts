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

  const queue = new Queue('post-market-monitoring', { connection });

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

  worker.on('completed', (job) => logger.info(`[PostMarketWorker] Job ${job.id} completed`));
  worker.on('failed', (job, err) => logger.error(`[PostMarketWorker] Job ${job?.id} failed:`, err));
  return worker;
}

import { Worker } from 'bullmq';
import { getRedisConnection } from '../config/redis';
import { DriftAlertService } from '../services/driftAlert.service';
import prisma from '../config/db';
import logger from '../utils/logger';

export function startDriftWorker() {
  const worker = new Worker('drift-scan', async (job) => {
    logger.info('[DriftWorker] Running scheduled drift scan for all organizations');
    const orgs = await prisma.organizations.findMany({ select: { id: true } });
    for (const org of orgs) {
      try {
        await DriftAlertService.runDriftScan(org.id);
      } catch (err) {
        logger.error(`[DriftWorker] Failed for org ${org.id}:`, err);
      }
    }
  }, { connection: getRedisConnection()! });

  worker.on('completed', (job) => logger.info(`[DriftWorker] Job ${job.id} completed`));
  worker.on('failed', (job, err) => logger.error(`[DriftWorker] Job ${job?.id} failed:`, err));
  return worker;
}

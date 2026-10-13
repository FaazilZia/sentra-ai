import 'dotenv/config';
import { initializePrisma } from './config/db';
import logger from './utils/logger';
import { setupConnectorWorkers, setupDriftWorker, setupEvaluationWorker, setupGovernanceWorker } from './workers/worker.manager';
import { setupScheduledJobs } from './services/queue.service';
import { Queue } from 'bullmq';
import { getRedisConnection } from './config/redis';
import { startDriftWorker } from './workers/drift.worker';
import { startPostMarketWorker } from './workers/postMarket.worker';

const startWorker = async () => {
  logger.info('[WORKER BOOT] Starting background worker process...');
  
  try {
    await initializePrisma();
    logger.info('[WORKER BOOT] Database layer initialized');

    // Initialize Background Workers & Schedules
    setupConnectorWorkers();
    setupDriftWorker();
    setupEvaluationWorker();
    setupGovernanceWorker();
    startDriftWorker();
    startPostMarketWorker();
    setupScheduledJobs().catch(err => logger.error('[WORKER BOOT] Failed to setup scheduled jobs:', err));

    // Schedule recurring scan every 15 minutes for all orgs
    const connection = getRedisConnection();
    if (connection) {
      const defaultJobOptions = {
        attempts: 3,
        backoff: { type: 'exponential' as const, delay: 2000 },
        removeOnComplete: { count: 100 },
        removeOnFail: false,
      };
      const driftQueue = new Queue('drift-scan', { connection, defaultJobOptions });
      await driftQueue.add('scan-all-orgs', {}, {
        repeat: { every: 15 * 60 * 1000 },
        removeOnComplete: 10,
        removeOnFail: 5,
      });
      logger.info('[WORKER BOOT] Scheduled recurring drift scan every 15 minutes.');
    }

    logger.info('[WORKER BOOT] All background workers successfully initialized and running.');
  } catch (error) {
    logger.error('[WORKER BOOT] Failed to initialize worker process:', error);
    process.exit(1);
  }
};

startWorker().catch(err => logger.error('[WORKER BOOT] Unhandled worker startup error:', err));

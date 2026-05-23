import 'dotenv/config';
import { initializePrisma } from './config/db';
import logger from './utils/logger';
import { setupConnectorWorkers, setupDriftWorker, setupEvaluationWorker } from './workers/worker.manager';
import { setupScheduledJobs } from './services/queue.service';

const startWorker = async () => {
  logger.info('[WORKER BOOT] Starting background worker process...');
  
  try {
    await initializePrisma();
    logger.info('[WORKER BOOT] Database layer initialized');

    // Initialize Background Workers & Schedules
    setupConnectorWorkers();
    setupDriftWorker();
    setupEvaluationWorker();
    setupScheduledJobs().catch(err => logger.error('[WORKER BOOT] Failed to setup scheduled jobs:', err));

    logger.info('[WORKER BOOT] All background workers successfully initialized and running.');
  } catch (error) {
    logger.error('[WORKER BOOT] Failed to initialize worker process:', error);
    process.exit(1);
  }
};

startWorker();

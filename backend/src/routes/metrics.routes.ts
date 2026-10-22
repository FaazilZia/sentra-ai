import { Router, Request, Response } from 'express';
import {
  metricsRegistry,
  queueDepthGauge,
  queueDepthTotalGauge,
  dlqCountGauge,
  dlqCountTotalGauge,
  blockedActionsGauge,
  flaggedActionsGauge,
  errorRateGauge,
  getCurrentErrorRate,
} from '../config/telemetry';
import {
  activityQueue,
  connectorQueue,
  driftQueue,
  evaluationQueue,
  automationsQueue,
  intakeLLMQueue,
  alertQueue,
  governanceQueue,
} from '../services/queue.service';
import prisma from '../config/db';
import { getRedisClient } from '../config/redis';
import { systemAlertService } from '../services/systemAlert.service';
import logger from '../utils/logger';

const router = Router();

function withTimeout<T>(promise: Promise<T>, ms: number = 1500, fallbackMessage: string = 'Operation timed out'): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(fallbackMessage)), ms)),
  ]);
}

const QUEUES_LIST = [
  { name: 'activity-logs', queue: activityQueue },
  { name: 'connector-scans', queue: connectorQueue },
  { name: 'drift-scans', queue: driftQueue },
  { name: 'evaluation-runs', queue: evaluationQueue },
  { name: 'automations', queue: automationsQueue },
  { name: 'intake-llm', queue: intakeLLMQueue },
  { name: 'alerts', queue: alertQueue },
  { name: 'governance-seeding', queue: governanceQueue },
];

/**
 * Collect dynamic metrics before serving scrape request
 */
async function collectMetricsSnapshot() {
  let totalQueueDepth = 0;
  let totalDlqCount = 0;
  const queueStats: Record<string, { depth: number; dlq: number }> = {};

  const redis = getRedisClient();
  const isRedisReady = redis && redis.status === 'ready';

  if (isRedisReady) {
    for (const item of QUEUES_LIST) {
      if (item.queue) {
        try {
          const counts = await withTimeout(
            item.queue.getJobCounts('waiting', 'active', 'delayed', 'failed'),
            1000,
            `Queue ${item.name} timed out`
          );
          const depth = (counts.waiting || 0) + (counts.active || 0) + (counts.delayed || 0);
          const dlq = counts.failed || 0;

          queueDepthGauge.set({ queue: item.name }, depth);
          dlqCountGauge.set({ queue: item.name }, dlq);

          queueStats[item.name] = { depth, dlq };
          totalQueueDepth += depth;
          totalDlqCount += dlq;

          // If DLQ is growing beyond threshold, trigger alert
          if (dlq > 0) {
            systemAlertService.triggerDLQGrowingAlert(item.name, dlq).catch((err) => {
              logger.warn(`Failed to trigger DLQ alert for ${item.name}:`, err);
            });
          }
        } catch (err: any) {
          logger.debug(`Failed to collect queue stats for ${item.name}: ${err.message}`);
        }
      }
    }
  }

  queueDepthTotalGauge.set(totalQueueDepth);
  dlqCountTotalGauge.set(totalDlqCount);

  // Collect Blocked and Flagged Action counts
  let blockedCount = 0;
  let flaggedCount = 0;
  try {
    const [blocked, flagged] = await withTimeout(
      Promise.all([
        prisma.logs.count({ where: { status: 'blocked' } }),
        prisma.logs.count({ where: { status: 'flagged' } }),
      ]),
      2000,
      'Database count query timed out'
    );
    blockedCount = blocked;
    flaggedCount = flagged;
    blockedActionsGauge.set(blocked);
    flaggedActionsGauge.set(flagged);
  } catch (err: any) {
    logger.debug(`Failed to query activity log status counts: ${err.message}`);
  }

  // Update current error rate
  const errorRate = getCurrentErrorRate();
  errorRateGauge.set(errorRate);

  return {
    totalQueueDepth,
    totalDlqCount,
    errorRate,
    blockedCount,
    flaggedCount,
    queueStats,
  };
}

// Protected Metrics endpoint (Bearer METRICS_SECRET_TOKEN)
router.get('/', async (req: Request, res: Response) => {
  const metricsToken = process.env.METRICS_SECRET_TOKEN;
  const isProduction = process.env.NODE_ENV === 'production';

  // Guard: require secret token in production, or when token configured in other envs
  if (isProduction || metricsToken) {
    const auth = req.headers.authorization;
    if (!metricsToken || !auth || auth !== `Bearer ${metricsToken}`) {
      return res.status(401).json({ error: 'Unauthorized: Valid METRICS_SECRET_TOKEN required' });
    }
  }

  const snapshot = await collectMetricsSnapshot();

  // Support JSON output when requested via Accept header or format query param
  if (req.headers.accept?.includes('application/json') || req.query.format === 'json') {
    return res.status(200).json({
      success: true,
      metrics: {
        queueDepth: snapshot.totalQueueDepth,
        dlqCount: snapshot.totalDlqCount,
        errorRate: snapshot.errorRate,
        blockedCount: snapshot.blockedCount,
        flaggedCount: snapshot.flaggedCount,
        queues: snapshot.queueStats,
      },
      timestamp: new Date().toISOString(),
    });
  }

  const metrics = await metricsRegistry.metrics();
  res.setHeader('Content-Type', metricsRegistry.contentType);
  res.end(metrics);
});

export default router;

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

interface QueueMetricsResult {
  name: string;
  depth: number;
  dlq: number;
}

async function fetchQueueMetrics(item: { name: string; queue: any }): Promise<QueueMetricsResult> {
  if (!item.queue) return { name: item.name, depth: 0, dlq: 0 };
  try {
    const counts = await withTimeout<Record<string, number>>(
      item.queue.getJobCounts('waiting', 'active', 'delayed', 'failed'),
      1000,
      `Queue ${item.name} timed out`
    );
    const depth = (counts.waiting || 0) + (counts.active || 0) + (counts.delayed || 0);
    const dlq = counts.failed || 0;
    return { name: item.name, depth, dlq };
  } catch (err: any) {
    logger.debug(`Failed to collect queue stats for ${item.name}: ${err.message}`);
    return { name: item.name, depth: 0, dlq: 0 };
  }
}

async function collectDatabaseMetrics(): Promise<{ blocked: number; flagged: number }> {
  try {
    const [blocked, flagged] = await withTimeout(
      Promise.all([
        prisma.logs.count({ where: { status: 'blocked' } }),
        prisma.logs.count({ where: { status: 'flagged' } }),
      ]),
      2000,
      'Database count query timed out'
    );
    return { blocked, flagged };
  } catch (err: any) {
    logger.debug(`Failed to query activity log status counts: ${err.message}`);
    return { blocked: 0, flagged: 0 };
  }
}

/**
 * Collect dynamic metrics before serving scrape request
 */
async function collectMetricsSnapshot() {
  let totalQueueDepth = 0;
  let totalDlqCount = 0;
  const queueStats: Record<string, { depth: number; dlq: number }> = {};

  const redis = getRedisClient();
  const isRedisReady = redis?.status === 'ready';

  if (isRedisReady) {
    const results = await Promise.all(QUEUES_LIST.map(fetchQueueMetrics));
    for (const res of results) {
      queueDepthGauge.set({ queue: res.name }, res.depth);
      dlqCountGauge.set({ queue: res.name }, res.dlq);

      queueStats[res.name] = { depth: res.depth, dlq: res.dlq };
      totalQueueDepth += res.depth;
      totalDlqCount += res.dlq;

      // If DLQ is growing beyond threshold, trigger alert
      if (res.dlq > 0) {
        systemAlertService.triggerDLQGrowingAlert(res.name, res.dlq).catch((err) => {
          logger.warn(`Failed to trigger DLQ alert for ${res.name}:`, err);
        });
      }
    }
  }

  queueDepthTotalGauge.set(totalQueueDepth);
  dlqCountTotalGauge.set(totalDlqCount);

  // Collect Blocked and Flagged Action counts
  const { blocked: blockedCount, flagged: flaggedCount } = await collectDatabaseMetrics();
  blockedActionsGauge.set(blockedCount);
  flaggedActionsGauge.set(flaggedCount);

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

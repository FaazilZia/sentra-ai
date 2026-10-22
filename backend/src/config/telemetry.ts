import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';
import logger from '../utils/logger';

// ─────────────────────────────────────────────
// Prometheus Registry
// ─────────────────────────────────────────────

export const metricsRegistry = new Registry();
metricsRegistry.setDefaultLabels({ app: 'sentra-ai' });

// Collect Node.js default metrics (memory, CPU, GC, event loop lag)
collectDefaultMetrics({ register: metricsRegistry });

// ─────────────────────────────────────────────
// Custom Metrics
// ─────────────────────────────────────────────

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'organization_id'],
  registers: [metricsRegistry],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [metricsRegistry],
});

// 1. Queue Depth Metrics
export const queueDepthGauge = new Gauge({
  name: 'sentra_queue_depth',
  help: 'Current number of active and waiting jobs in BullMQ queues',
  labelNames: ['queue'],
  registers: [metricsRegistry],
});

export const queueDepthTotalGauge = new Gauge({
  name: 'sentra_queue_depth_total',
  help: 'Total number of active and waiting jobs across all BullMQ queues',
  registers: [metricsRegistry],
});

// 2. Dead Letter Queue (DLQ) / Failed Jobs Metrics
export const dlqCountGauge = new Gauge({
  name: 'sentra_dlq_count',
  help: 'Current number of failed jobs (DLQ) in BullMQ queues',
  labelNames: ['queue'],
  registers: [metricsRegistry],
});

export const dlqCountTotalGauge = new Gauge({
  name: 'sentra_dlq_count_total',
  help: 'Total number of failed jobs (DLQ) across all BullMQ queues',
  registers: [metricsRegistry],
});

// 3. Error Rate & Error Count Metrics
export const httpErrorsTotal = new Counter({
  name: 'sentra_http_errors_total',
  help: 'Total HTTP error responses (4xx and 5xx)',
  labelNames: ['status_code', 'method', 'route'],
  registers: [metricsRegistry],
});

export const errorRateGauge = new Gauge({
  name: 'sentra_error_rate',
  help: 'Ratio of 5xx HTTP server errors to total requests',
  registers: [metricsRegistry],
});

// 4. Governance Decision Metrics (Blocked / Flagged)
export const decisionsBlockedTotal = new Counter({
  name: 'sentra_decisions_blocked_total',
  help: 'Total cumulative count of AI actions blocked by governance rules',
  registers: [metricsRegistry],
});

export const decisionsFlaggedTotal = new Counter({
  name: 'sentra_decisions_flagged_total',
  help: 'Total cumulative count of AI actions flagged by governance rules',
  registers: [metricsRegistry],
});

export const blockedActionsGauge = new Gauge({
  name: 'sentra_blocked_actions_count',
  help: 'Current database count of blocked actions',
  registers: [metricsRegistry],
});

export const flaggedActionsGauge = new Gauge({
  name: 'sentra_flagged_actions_count',
  help: 'Current database count of flagged actions',
  registers: [metricsRegistry],
});

// Internal tracking for sliding window error rate
let totalRequestsCount = 0;
let serverErrors5xxCount = 0;

export function recordGovernanceDecision(status: string) {
  if (status === 'blocked') {
    decisionsBlockedTotal.inc();
  } else if (status === 'flagged') {
    decisionsFlaggedTotal.inc();
  }
}

export function getCurrentErrorRate(): number {
  if (totalRequestsCount === 0) return 0;
  return serverErrors5xxCount / totalRequestsCount;
}

// ─────────────────────────────────────────────
// HTTP Instrumentation Middleware
// ─────────────────────────────────────────────

export const prometheusMiddleware = (req: any, res: any, next: any) => {
  const startTime = Date.now();
  const route = req.route?.path || req.path || 'unknown';

  res.on('finish', () => {
    const durationSec = (Date.now() - startTime) / 1000;
    const statusCode = res.statusCode;
    const statusCodeStr = statusCode.toString();

    totalRequestsCount++;

    const labels = {
      method: req.method,
      route,
      status_code: statusCodeStr,
    };

    httpRequestsTotal.inc({
      ...labels,
      organization_id: req.user?.organizationId || 'anon',
    });
    httpRequestDuration.observe(labels, durationSec);

    // Track 4xx and 5xx errors
    if (statusCode >= 400) {
      httpErrorsTotal.inc(labels);
    }

    if (statusCode >= 500) {
      serverErrors5xxCount++;
      const currentRate = serverErrors5xxCount / totalRequestsCount;
      errorRateGauge.set(currentRate);
    }
  });

  next();
};

logger.info('[Telemetry] Prometheus metrics registry initialized');

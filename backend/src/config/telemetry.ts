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

export const authFailuresTotal = new Counter({
  name: 'auth_failures_total',
  help: 'Total number of authentication failures',
  labelNames: ['reason', 'ip'],
  registers: [metricsRegistry],
});

export const activeSessionsGauge = new Gauge({
  name: 'active_sessions_total',
  help: 'Number of currently active user sessions',
  registers: [metricsRegistry],
});

export const queueJobsTotal = new Counter({
  name: 'queue_jobs_total',
  help: 'Total queue jobs processed',
  labelNames: ['queue_name', 'status'],
  registers: [metricsRegistry],
});

export const policyViolationsTotal = new Counter({
  name: 'policy_violations_total',
  help: 'Total AI policy violations detected',
  labelNames: ['organization_id', 'severity'],
  registers: [metricsRegistry],
});

export const driftAlertsTotal = new Counter({
  name: 'drift_alerts_total',
  help: 'Total drift alerts triggered',
  labelNames: ['organization_id', 'severity'],
  registers: [metricsRegistry],
});

export const governanceScoreGauge = new Gauge({
  name: 'governance_score',
  help: 'Current governance score per organization (0-100)',
  labelNames: ['organization_id'],
  registers: [metricsRegistry],
});

export const evaluationRunsTotal = new Counter({
  name: 'evaluation_runs_total',
  help: 'Total AI evaluation runs executed',
  labelNames: ['organization_id', 'status', 'run_type'],
  registers: [metricsRegistry],
});

export const auditLogEntriesTotal = new Counter({
  name: 'audit_log_entries_total',
  help: 'Total audit log entries written',
  labelNames: ['organization_id', 'event_type', 'severity'],
  registers: [metricsRegistry],
});

export const mfaAttempts = new Counter({
  name: 'mfa_attempts_total',
  help: 'MFA verification attempts',
  labelNames: ['outcome'],
  registers: [metricsRegistry],
});

// ─────────────────────────────────────────────
// HTTP Instrumentation Middleware
// ─────────────────────────────────────────────

export const prometheusMiddleware = (req: any, res: any, next: any) => {
  const startTime = Date.now();
  const route = req.route?.path || req.path || 'unknown';

  res.on('finish', () => {
    const durationSec = (Date.now() - startTime) / 1000;
    const labels = {
      method: req.method,
      route,
      status_code: res.statusCode.toString(),
    };

    httpRequestsTotal.inc({
      ...labels,
      organization_id: req.user?.organizationId || 'anon',
    });
    httpRequestDuration.observe(labels, durationSec);
  });

  next();
};

logger.info('[Telemetry] Prometheus metrics registry initialized');

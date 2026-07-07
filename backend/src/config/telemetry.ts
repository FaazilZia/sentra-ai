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

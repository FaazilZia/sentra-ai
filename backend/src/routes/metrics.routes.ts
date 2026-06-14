import { Router, Request, Response } from 'express';
import { metricsRegistry } from '../config/telemetry';

// REQUIRED: Set METRICS_SECRET_TOKEN in production env vars.
// If unset, this endpoint is publicly accessible.

const router = Router();

const METRICS_TOKEN = process.env.METRICS_SECRET_TOKEN;

// Prometheus scrape endpoint — protected by static bearer token
router.get('/', async (req: Request, res: Response) => {
  // Guard: require secret token if configured
  if (METRICS_TOKEN) {
    const auth = req.headers.authorization;
    if (!auth || auth !== `Bearer ${METRICS_TOKEN}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const metrics = await metricsRegistry.metrics();
  res.setHeader('Content-Type', metricsRegistry.contentType);
  res.end(metrics);
});

export default router;

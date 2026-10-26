import request from 'supertest';
import app from '../app';

describe('Monitoring & Observability Endpoints', () => {
  const originalEnv = { ...process.env };

  beforeAll(() => {
    process.env.METRICS_SECRET_TOKEN = 'test_metrics_token_secret_1234567890';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('GET /health (Liveness Probe)', () => {
    it('returns HTTP 200 with status ok and process uptime', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(typeof res.body.uptime).toBe('number');
      expect(res.body.version).toBe('2.0.0');
      expect(res.body.timestamp).toBeDefined();
    });

    it('returns HTTP 200 on /api/health and /api/v1/health aliases', async () => {
      const res1 = await request(app).get('/api/health');
      expect(res1.status).toBe(200);
      expect(res1.body.status).toBe('ok');

      const res2 = await request(app).get('/api/v1/health');
      expect(res2.status).toBe(200);
      expect(res2.body.status).toBe('ok');
    });
  });

  describe('GET /ready (Readiness Probe)', () => {
    it('returns checks for db, redis, and queue', async () => {
      const res = await request(app).get('/ready');
      expect([200, 503]).toContain(res.status);
      expect(res.body.checks).toBeDefined();
      expect(['ok', 'failed']).toContain(res.body.checks.db);
      expect(['ok', 'failed']).toContain(res.body.checks.redis);
      expect(['ok', 'failed']).toContain(res.body.checks.queue);
      expect(['ok', 'failed']).toContain(res.body.checks.schema);
      expect(res.body.timestamp).toBeDefined();
    });

    it('returns readiness payload on /api/ready and /api/v1/ready aliases', async () => {
      const res1 = await request(app).get('/api/ready');
      expect([200, 503]).toContain(res1.status);
      expect(res1.body.checks).toBeDefined();

      const res2 = await request(app).get('/api/v1/ready');
      expect([200, 503]).toContain(res2.status);
      expect(res2.body.checks).toBeDefined();
    });
  });

  describe('GET /metrics (Protected Metrics Endpoint)', () => {
    it('rejects unauthenticated requests when METRICS_SECRET_TOKEN is set', async () => {
      const res = await request(app).get('/metrics');
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Unauthorized');
    });

    it('rejects requests with invalid Bearer token', async () => {
      const res = await request(app)
        .get('/metrics')
        .set('Authorization', 'Bearer wrong-token');
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Unauthorized');
    });

    it('returns Prometheus text metrics when valid Bearer token is provided', async () => {
      const res = await request(app)
        .get('/metrics')
        .set('Authorization', `Bearer ${process.env.METRICS_SECRET_TOKEN}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/plain');
      const text = res.text;

      // Verify required metrics are registered and exposed
      expect(text).toContain('sentra_queue_depth');
      expect(text).toContain('sentra_dlq_count');
      expect(text).toContain('sentra_error_rate');
      expect(text).toContain('sentra_decisions_blocked_total');
      expect(text).toContain('sentra_decisions_flagged_total');
    });

    it('returns JSON metrics when Accept header specifies application/json', async () => {
      const res = await request(app)
        .get('/metrics')
        .set('Authorization', `Bearer ${process.env.METRICS_SECRET_TOKEN}`)
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.metrics).toBeDefined();
      expect(typeof res.body.metrics.queueDepth).toBe('number');
      expect(typeof res.body.metrics.dlqCount).toBe('number');
      expect(typeof res.body.metrics.errorRate).toBe('number');
      expect(typeof res.body.metrics.blockedCount).toBe('number');
      expect(typeof res.body.metrics.flaggedCount).toBe('number');
      expect(res.body.metrics.queues).toBeDefined();
    });
  });
});

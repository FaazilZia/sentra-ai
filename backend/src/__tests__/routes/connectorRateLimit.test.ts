import express from 'express';
import request from 'supertest';
import rateLimit from 'express-rate-limit';

describe('Connector Test Connection Rate Limiting (Per-Organization)', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Rate limiter configured with keyGenerator: req.user?.organizationId
    const orgRateLimiter = rateLimit({
      windowMs: 60 * 1000,
      max: 3, // Set low threshold to test per-org isolation
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        message: 'Rate limit exceeded: Too many connection test requests for this organization. Please wait before testing again.',
      },
      keyGenerator: (req: any) => req.user?.organizationId || req.ip || 'global',
    });

    // Mock authentication middleware populating req.user based on header
    app.use((req: any, _res, next) => {
      const orgId = req.headers['x-test-org-id'];
      if (orgId) {
        req.user = { organizationId: String(orgId) };
      }
      next();
    });

    app.post('/api/connectors/test', orgRateLimiter, (_req, res) => {
      res.status(200).json({ success: true, message: 'Connection test passed' });
    });
  });

  it('enforces rate limit per organization independently without cross-org throttling', async () => {
    const ORG_A = 'org-alpha-111';
    const ORG_B = 'org-bravo-222';

    // 1. Org A exhausts its quota of 3 requests
    for (let i = 1; i <= 3; i++) {
      const resA = await request(app)
        .post('/api/connectors/test')
        .set('x-test-org-id', ORG_A)
        .send({ type: 'postgres' });
      expect(resA.status).toBe(200);
      expect(resA.body.success).toBe(true);
    }

    // 2. Org A's 4th request must be rejected with HTTP 429
    const blockedA = await request(app)
      .post('/api/connectors/test')
      .set('x-test-org-id', ORG_A)
      .send({ type: 'postgres' });
    expect(blockedA.status).toBe(429);
    expect(blockedA.body.message).toContain('Rate limit exceeded: Too many connection test requests for this organization');

    // 3. Org B makes requests at the same time: must NOT be blocked by Org A's quota
    const resB1 = await request(app)
      .post('/api/connectors/test')
      .set('x-test-org-id', ORG_B)
      .send({ type: 'postgres' });
    expect(resB1.status).toBe(200);
    expect(resB1.body.success).toBe(true);

    const resB2 = await request(app)
      .post('/api/connectors/test')
      .set('x-test-org-id', ORG_B)
      .send({ type: 'postgres' });
    expect(resB2.status).toBe(200);
    expect(resB2.body.success).toBe(true);

    // 4. Verify Org A remains blocked
    const stillBlockedA = await request(app)
      .post('/api/connectors/test')
      .set('x-test-org-id', ORG_A)
      .send({ type: 'postgres' });
    expect(stillBlockedA.status).toBe(429);
  });
});

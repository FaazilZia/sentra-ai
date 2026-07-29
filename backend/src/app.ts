// Polyfill: BigInt → JSON serialization (required for Prisma BigInt columns)
(BigInt.prototype as any).toJSON = function () { return Number(this); };

import express, { Application } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { errorHandler } from './middleware/error.middleware';
import { contextMiddleware } from './middleware/context.middleware';
import { authenticate } from './middleware/auth.middleware';
import { postEvaluate } from './controllers/ai.controller';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import userRoutes from './routes/user.routes';
import incidentRoutes from './routes/incident.routes';
import consentRoutes from './routes/consent.routes';
import policyRoutes from './routes/policy.routes';
import organizationRoutes from './routes/organization.routes';
import aiRoutes from './routes/ai.routes';
import connectorRoutes from './routes/connector.routes';
import inventoryRoutes from './routes/inventory.routes';
import alertRoutes from './routes/alert.routes';
import driftRoutes from './routes/drift.routes';
import complianceRoutes from './routes/compliance.routes';
import shadowAIRoutes from './routes/shadowAI.routes';
import aiSystemRoutes from './routes/aiSystem.routes';
import governanceRoutes from './routes/governance.routes';
import ssoRoutes from './routes/sso.routes';
import executiveReportRoutes from './routes/executiveReport.routes';
import publicRoutes from './routes/public.routes';
import vendorRoutes from './routes/vendor.routes';
import fileIngestionRoutes from './routes/fileIngestion.routes';
import postMarketMonitoringRoutes from './routes/postMarketMonitoring.routes';
import mcpRoutes from './routes/mcp.routes';
import mcpAgentKeyRoutes from './routes/mcpAgentKey.routes';
import gdprRoutes from './routes/gdpr.routes';
import hipaaRoutes from './routes/hipaa.routes';
import pciRoutes from './routes/pci.routes';
import dpdpRoutes from './routes/dpdp.routes';


import advisorRoutes from './routes/advisor.routes';
import automationRoutes from './routes/automation.routes';
import datasetRoutes from './routes/dataset.routes';
import modelLifecycleRoutes from './routes/modelLifecycle.routes';
import trainingRoutes from './routes/training.routes';
import frameworkMapperRoutes from './routes/frameworkMapper.routes';
import reportsRoutes from './routes/reports.routes';

import guardrailRoutes from './routes/guardrail.routes';
import quantitativeRiskRoutes from './routes/quantitativeRisk.routes';
import risksRoutes from './routes/risks.routes';
import shareLinkRoutes from './routes/shareLink.routes';
import intelligenceRoutes from './routes/intelligence.routes';
import demoRoutes from './routes/demo.routes';
import tenantRoutes from './routes/tenant.routes';
import rbacRoutes from './routes/rbac.routes';
import auditRoutes from './routes/audit.routes';
import workflowRoutes from './routes/workflow.routes';
import evaluationRoutes from './routes/evaluation.routes';

import superadminRoutes from './routes/superadmin.routes';
import metricsRoutes from './routes/metrics.routes';
import notificationRoutes from './routes/notification.routes';
import evidenceRoutes from './routes/evidence.routes';
import searchRoutes from './routes/search.routes';
import slackRoutes from './routes/slack.routes';
import changeHistoryRoutes from './routes/changeHistory.routes';
import intakeRoutes from './routes/intakeForm.routes';
import interceptRoutes from './routes/intercept.routes';
import logsRoutes from './routes/logs.routes';
import complianceCRUDRoutes from './routes/complianceCRUD.routes';
import reportCRUDRoutes from './routes/reportCRUD.routes';
import agentDiscoveryRoutes from './routes/agentDiscovery.routes';
import intakeFormBuilderRoutes from './routes/intakeFormBuilder.routes';
import settingsRoutes from './routes/settings.routes';
import prisma, { dbHealth } from './config/db';
import { redisHealthCheck, getRedisClient } from './config/redis';
import { alertQueue } from './services/queue.service';
import { prometheusMiddleware } from './config/telemetry';
import { auditRequest } from './middleware/audit.middleware';

import { apiRateLimiter, getRateLimitRedisStatus } from './config/rateLimit';
import { securityObservability } from './middleware/security.middleware';
import { csrfProtection } from './middleware/csrf.middleware';

import * as Sentry from '@sentry/node';

import crypto from 'crypto';
import pinoHttp from 'pino-http';
import logger, { rawPinoLogger } from './utils/logger';
import { requestIdMiddleware } from './middleware/requestId.middleware';

const app: Application = express();
app.set('trust proxy', 1);

logger.info('[BOOT] Express app created');
logger.info(`[BOOT] Timestamp: ${new Date().toISOString()}`);

// Minimal diagnostics & health check routes (MUST be registered first to bypass all middlewares)

app.get('/startup-check', async (_, res) => {
  let migrationStatus = null;
  try {
    const migrationFile = path.join(process.cwd(), 'migration.json');
    if (fs.existsSync(migrationFile)) {
      migrationStatus = JSON.parse(fs.readFileSync(migrationFile, 'utf8'));
    }
  } catch (err: any) {
    migrationStatus = { error: err.message };
  }

  let dbCheck = null;
  try {
    const userCount = await prisma.users.count();
    const adminUser = await prisma.users.findUnique({ where: { email: 'admin@sentra.ai' } });
    
    let refreshTokenTest: any = 'not_run';
    if (adminUser) {
      try {
        const testToken = `test-token-${Date.now()}`;
        const createdToken = await prisma.refreshToken.create({
          data: {
            token: testToken,
            userId: adminUser.id,
            expiresAt: new Date(Date.now() + 10000)
          }
        });
        await prisma.refreshToken.delete({ where: { token: testToken } });
        refreshTokenTest = 'success';
      } catch (tokenErr: any) {
        refreshTokenTest = { error: tokenErr.message, code: tokenErr.code, stack: tokenErr.stack };
      }
    }
    dbCheck = { 
      status: 'ok', 
      userCount, 
      adminExists: !!adminUser, 
      adminId: adminUser?.id, 
      refreshTokenTest 
    };
  } catch (err: any) {
    dbCheck = { status: 'error', message: err.message, code: err.code, stack: err.stack };
  }

  return res.json({
    status: 'alive',
    port: process.env.PORT,
    uptime: process.uptime(),
    migration: migrationStatus,
    dbCheck: dbCheck
  });
});

const runDeepHealthCheck = async (req: any, res: any) => {
  const start = performance.now();
  const redis = getRedisClient();

  if (!redis || !alertQueue) {
    const duration = (performance.now() - start).toFixed(3);
    return res.status(503).json({
      status: 'degraded',
      db: 'ok',
      redis: redis ? 'ok' : 'failed',
      queue: alertQueue ? 'ok' : 'failed',
      version: '2.0.0',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const checks = await Promise.allSettled([
      prisma.$queryRaw`SELECT 1`,
      redis.ping(),
      alertQueue.getWorkers(),
    ]);

    const dbOk = checks[0].status === 'fulfilled';
    const redisOk = checks[1].status === 'fulfilled' && (checks[1] as any).value === 'PONG';
    const queueOk = checks[2].status === 'fulfilled';

    const allOk = dbOk && redisOk && queueOk;
    const status = allOk ? 200 : 503;

    return res.status(status).json({
      status: allOk ? 'ok' : 'degraded',
      db: dbOk ? 'ok' : 'failed',
      redis: redisOk ? 'ok' : 'failed',
      queue: queueOk ? 'ok' : 'failed',
      version: '2.0.0',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return res.status(503).json({
      status: 'degraded',
      error: error.message,
      version: '2.0.0',
      timestamp: new Date().toISOString()
    });
  }
};

app.get('/health', runDeepHealthCheck);
app.get('/api/health', runDeepHealthCheck);
app.get('/api/v1/health', runDeepHealthCheck);

const handleReadyRequest = (req: any, res: any) => {
  const start = performance.now();
  const dbStatus = dbHealth.isHealthy ? 'connected' : 'disconnected';
  const redisStatus = getRateLimitRedisStatus();

  if (dbHealth.isHealthy) {
    const isDegraded = redisStatus === 'degraded';
    res.status(200).json({ 
      status: isDegraded ? 'degraded' : 'ready', 
      db: dbStatus, 
      redis: redisStatus,
      message: isDegraded ? 'Operational but distributed rate limiting is offline.' : 'Full system operational'
    });
  } else {
    res.status(503).json({ 
      status: 'unhealthy', 
      db: dbStatus, 
      redis: redisStatus, 
      error: 'Critical database failure' 
    });
  }
  
  const duration = (performance.now() - start).toFixed(3);
  const sanitizedUrl = String(req.originalUrl || req.url).replaceAll(/[\r\n]/g, '');
  logger.info(`[HEALTH] Responded to ${sanitizedUrl} in ${duration} ms`);
};

app.get('/api/ready', handleReadyRequest);
app.get('/api/v1/ready', handleReadyRequest);

import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';

logger.info('[BOOT] Health endpoints active');

// Expose Swagger OpenAPI JSON document
app.get('/api-docs', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Swagger UI authentication middleware (Allows non-production or authenticated users)
const swaggerAuthMiddleware = (req: any, res: any, next: any) => {
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return next();
  }
  if (req.cookies?.accessToken || req.cookies?.token) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized. Access to API Docs UI in production requires authentication.' });
};

// Mount Swagger UI
app.use('/api-docs/ui', swaggerAuthMiddleware, swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Initialize Sentry for observability
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1, // Reduced in production for cost/performance
    environment: process.env.NODE_ENV || 'production',
    integrations: [
      // Express integration is added automatically in newer versions or via integrations
    ],
  });
}

// Request ID injection (must be first so all logs carry req.id)
app.use(requestIdMiddleware);

// Structured HTTP logging via pino-http (replaces morgan for JSON production logs)
if (process.env.NODE_ENV !== 'test') {
  app.use(pinoHttp({
    logger: rawPinoLogger,
    genReqId: (req: any) => req.id || req.headers['x-request-id'],
    customLogLevel: (_req, res) => {
      if (res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    serializers: {
      req: (req) => ({ method: req.method, url: req.url, id: req.id }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
  }));
}

// Nonce Middleware for CSP
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
});

// Strict Security Middleware with Nonce
app.use(helmet({
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", (req, res: any) => `'nonce-${res.locals.nonce}'`],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.openai.com', 'https://*.supabase.co', 'wss://*.supabase.co'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    }
  }
}));
app.use(securityObservability);

const isProduction = process.env.NODE_ENV === 'production';
const corsOrigins = process.env.CORS_ALLOWED_ORIGINS || process.env.FRONTEND_URL;
const allowedOrigins = corsOrigins 
  ? corsOrigins.split(',').map(o => o.trim()) 
  : ['http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.includes(origin) || 
                      (!isProduction && origin.includes('localhost')) ||
                      origin.endsWith('.vercel.app');
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Key', 'X-Workspace-Id', 'X-Idempotency-Key', 'X-CSRF-Token'],
  exposedHeaders: ['x-csrf-token']
}));

// Minimal diagnostics & health check routes (mounted after Helmet/CORS to inherit security/CORS headers)
app.get('/ping', (req, res) => res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() }));

// Prometheus HTTP instrumentation
app.use(prometheusMiddleware);

// Prometheus metrics endpoint (before auth)
app.use('/metrics', metricsRoutes);

app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use(csrfProtection);
// Morgan kept only for non-production development convenience; pino-http handles prod JSON logs
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use(contextMiddleware);
// Automatic audit logging for all mutating requests
app.use(auditRequest);

// Global API Rate Limiter
app.use('/api', apiRateLimiter);

// Versioned Routes (v1)
const v1Router = express.Router();

v1Router.use('/auth', authRoutes);
v1Router.use('/admin', adminRoutes);
v1Router.use('/user', userRoutes);
v1Router.use('/users', userRoutes);
v1Router.use('/settings', settingsRoutes);
v1Router.use('/incidents', incidentRoutes);
v1Router.use('/consent', consentRoutes);
v1Router.use('/policies', policyRoutes);
v1Router.use('/organizations', organizationRoutes);
v1Router.use('/ai', aiRoutes);
v1Router.use('/connectors', connectorRoutes);
v1Router.use('/inventory', inventoryRoutes);
v1Router.use('/alerts', alertRoutes);
v1Router.use('/drift', driftRoutes);
v1Router.use('/compliance', complianceRoutes);
v1Router.use('/compliance', complianceCRUDRoutes);
v1Router.use('/guardrails', guardrailRoutes);
v1Router.use('/intercept', interceptRoutes);
v1Router.use('/logs', logsRoutes);
v1Router.use('/agents', agentDiscoveryRoutes);
v1Router.use('/risk', quantitativeRiskRoutes);
v1Router.use('/risks', risksRoutes);
v1Router.use('/share-links', shareLinkRoutes);
v1Router.use('/intelligence', intelligenceRoutes);
v1Router.use('/shadow-ai', shadowAIRoutes);
v1Router.use('/ai-systems', aiSystemRoutes);
v1Router.use('/governance', governanceRoutes);
v1Router.use('/vendors', vendorRoutes);
v1Router.use('/gdpr', gdprRoutes);
v1Router.use('/hipaa', hipaaRoutes);
v1Router.use('/pci', pciRoutes);
v1Router.use('/dpdp', dpdpRoutes);

v1Router.use('/reports/executive', executiveReportRoutes);

v1Router.use('/advisor', advisorRoutes);
v1Router.use('/automations', automationRoutes);
v1Router.use('/datasets', datasetRoutes);
v1Router.use('/model-lifecycle', modelLifecycleRoutes);
v1Router.use('/training', trainingRoutes);
v1Router.use('/framework-mapper', frameworkMapperRoutes);
v1Router.use('/reports', reportsRoutes);
v1Router.use('/reports', reportCRUDRoutes);

v1Router.use('/notifications', notificationRoutes);
v1Router.use('/evidence', evidenceRoutes);
v1Router.use('/evidence-files', fileIngestionRoutes);
v1Router.use('/file-ingestion', fileIngestionRoutes);
v1Router.use('/post-market-monitoring', postMarketMonitoringRoutes);
v1Router.use('/search', searchRoutes);
v1Router.use('/slack', slackRoutes);
v1Router.use('/change-history', changeHistoryRoutes);
v1Router.use('/intake', intakeRoutes);
v1Router.use('/intake-forms', intakeFormBuilderRoutes);
v1Router.use('/public', publicRoutes);
v1Router.use('/mcp', mcpRoutes);
v1Router.use('/mcp', mcpAgentKeyRoutes);
v1Router.use('/', ssoRoutes);


// ── Enterprise SaaS Routes ────────────────────
v1Router.use('/tenant', tenantRoutes);
v1Router.use('/rbac', rbacRoutes);
v1Router.use('/audit', auditRoutes);
v1Router.use('/workflows', workflowRoutes);
// /evaluation → all evaluation routes (score, runs, datasets, bias audit, live-run)
v1Router.use('/evaluation', evaluationRoutes);

v1Router.use('/superadmin', superadminRoutes);

// Mount demo routes conditionally to enable attack simulations
if (process.env.NODE_ENV !== 'production') {
  v1Router.use('/demo', demoRoutes);
}


// Note: /api/v1/health and /api/v1/ready are mounted directly on the app instance above for non-blocking execution.

// Root of v1
v1Router.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Sentraa AI API v1 Operational',
    status: 'ONLINE',
    organization_centric: true 
  });
});

// Penetration test evaluation endpoints (supporting multiple URL formats)
app.post('/v1/evaluate', authenticate, postEvaluate);
app.post('/api/v1/evaluate', authenticate, postEvaluate);
v1Router.post('/evaluate', authenticate, postEvaluate);

app.use('/api/v1', v1Router);



// Root route to check version
app.get('/', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'Sentraa AI Enterprise API',
    version: '2.0.0'
  });
});

// Global Error Handler
Sentry.setupExpressErrorHandler(app);
app.use(errorHandler);

logger.info('[BOOT] Routes mounted');

export default app;

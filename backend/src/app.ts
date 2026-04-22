import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './middleware/error.middleware';
import { contextMiddleware } from './middleware/context.middleware';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import userRoutes from './routes/user.routes';
import incidentRoutes from './routes/incident.routes';
import consentRoutes from './routes/consent.routes';
import policyRoutes from './routes/policy.routes';
import companyRoutes from './routes/company.routes';
import aiRoutes from './routes/ai.routes';
import connectorRoutes from './routes/connector.routes';
import inventoryRoutes from './routes/inventory.routes';
import driftRoutes from './routes/drift.routes';
import complianceRoutes from './routes/compliance.routes';
import guardrailRoutes from './routes/guardrail.routes';

import { apiRateLimiter } from './config/rateLimit';
import { securityObservability } from './middleware/security.middleware';

import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

import crypto from 'crypto';

const app: Application = express();

// Nonce Middleware for CSP
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
});

// Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN || '',
  integrations: [
    nodeProfilingIntegration(),
  ],
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
  environment: process.env.NODE_ENV || 'development'
});

// Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN || '',
  integrations: [
    nodeProfilingIntegration(),
  ],
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
  environment: process.env.NODE_ENV || 'development'
});

// Strict Security Middleware with Nonce
app.use(helmet({
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'deny'
  },
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
const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map(o => o.trim()) 
  : ['http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    // In production, be strict. In development, allow localhost and Vercel previews.
    const isAllowed = allowedOrigins.includes(origin) || 
                      (!isProduction && (origin.endsWith('.vercel.app') || origin.includes('localhost')));
                      
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked for origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Key']
}));
app.use(express.json());
app.use(morgan('dev'));
app.use(contextMiddleware);

// Global API Rate Limiter
app.use('/api', apiRateLimiter);

// Versioned Routes (v1)
const v1Router = express.Router();

v1Router.use('/auth', authRoutes);
v1Router.use('/admin', adminRoutes);
v1Router.use('/user', userRoutes);
v1Router.use('/incidents', incidentRoutes);
v1Router.use('/consent', consentRoutes);
v1Router.use('/policies', policyRoutes);
v1Router.use('/companies', companyRoutes);
v1Router.use('/ai', aiRoutes);
v1Router.use('/connectors', connectorRoutes);
v1Router.use('/inventory', inventoryRoutes);
v1Router.use('/drift', driftRoutes);
v1Router.use('/compliance', complianceRoutes);
v1Router.use('/guardrails', guardrailRoutes);


// Health check under v1
v1Router.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', version: 'v1' });
});

// Readiness probe (Supports Degraded Mode)
v1Router.get('/ready', async (req, res) => {
  let dbStatus = 'disconnected';
  let redisStatus = 'disconnected';
  
  try {
    const prisma = require('./config/db').default;
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';

    // Check Redis (Non-critical, allows degraded mode)
    try {
      const Redis = require('ioredis');
      const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
      const pong = await redis.ping();
      if (pong === 'PONG') redisStatus = 'connected';
      redis.disconnect();
    } catch (e) {
      redisStatus = 'failed (degraded)';
    }

    if (dbStatus === 'connected') {
      const isDegraded = redisStatus !== 'connected';
      return res.status(200).json({ 
        status: isDegraded ? 'degraded' : 'ready', 
        db: dbStatus, 
        redis: redisStatus,
        message: isDegraded ? 'Operational but distributed rate limiting is offline.' : 'Full system operational'
      });
    }
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', db: dbStatus, redis: redisStatus, error: 'Critical database failure' });
  }
});

// Root of v1
v1Router.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Sentra AI API v1 Operational',
    status: 'ONLINE',
    company_centric: true 
  });
});

app.use('/api/v1', v1Router);

// Legacy support (redirect /api to /api/v1 for major routes)
app.use('/api/ai', aiRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/connectors', connectorRoutes);
app.use('/api/consent', consentRoutes);
app.use('/api/user', userRoutes);
app.use('/api/health', (req, res) => res.redirect('/api/v1/health'));

// Root route to check version
app.get('/', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'Sentra AI Node Backend',
    version: '1.0.0'
  });
});

// Global Error Handler
Sentry.setupExpressErrorHandler(app);
app.use(errorHandler);

export default app;

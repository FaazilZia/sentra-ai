import 'dotenv/config';

// Hard-required: server cannot function without these
const REQUIRED_ENV_VARS = [
  'JWT_SECRET',
  'REFRESH_SECRET',
];

// Database URL check with DIRECT_URL fallback
const dbUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;
const missing = REQUIRED_ENV_VARS.filter((v) => !process.env[v]);

if (!dbUrl) missing.push('DATABASE_URL');

if (missing.length > 0) {
  console.error('\n' + '='.repeat(50));
  console.error('[STARTUP FATAL] Missing required environment variables:');
  missing.forEach(v => console.error(` - ${v}`));
  console.error('Please ensure these are set in your Render dashboard or .env file.');
  console.error('='.repeat(50) + '\n');
  process.exit(1);
}

// Soft warnings: system runs in degraded mode without these
if (!process.env.REDIS_URL) {
  console.warn('[STARTUP WARNING] REDIS_URL not set. Rate limiting and caching will use in-memory fallbacks.');
}
if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.length < 10) {
  console.warn('[STARTUP WARNING] OPENAI_API_KEY not set. Semantic risk analysis will be disabled — pattern-based engines will enforce governance.');
}
if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length < 32) {
  console.warn('[STARTUP WARNING] ENCRYPTION_KEY not set or too short. Connector credential encryption and connector workers may fail until this is configured.');
}


// Production-specific hardening
if (process.env.NODE_ENV === 'production') {
  if (!process.env.FRONTEND_URL) {
    console.error('\n' + '!'.repeat(50));
    console.error('[STARTUP FATAL] FRONTEND_URL is required in production.');
    console.error('This is used for CORS and Secure Cookie configuration.');
    console.error('!'.repeat(50) + '\n');
    process.exit(1);
  }

  // Guard against demo mode in production
  if (process.env.VITE_DEMO_MODE === 'true') {
    console.warn('[STARTUP WARNING] Demo mode (VITE_DEMO_MODE=true) is active in production. This should only be used for testing.');
  }

  // Check secret strength
  if ((process.env.JWT_SECRET?.length ?? 0) < 32) {
    console.warn('[STARTUP WARNING] JWT_SECRET is shorter than 32 characters. Consider using a stronger secret for production.');
  }
}
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app';
import logger from './utils/logger';
import prisma, { initializePrisma } from './config/db';
import { setupScheduledJobs } from './services/queue.service';
import { setupConnectorWorkers, setupDriftWorker } from './workers/worker.manager';
import { alertService } from './services/alert.service';
import { verifyAccessToken } from './utils/jwt';
import { redisHealthCheck } from './config/redis';

const PORT = Number(process.env.PORT) || 10000;
const httpServer = createServer(app);

// Use the same CORS origins as Express — never wildcard in production
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(o => o.trim())
  : [];

const socketOrigins = [
  ...allowedOrigins,
  'http://localhost:5173',
  'http://localhost:3000'
];

const io = new Server(httpServer, {
  cors: {
    origin: socketOrigins,
    methods: ['GET', 'POST']
  }
});

io.use(async (socket, next) => {
  try {
    const authToken = typeof socket.handshake.auth?.token === 'string'
      ? socket.handshake.auth.token
      : undefined;
    const headerValue = socket.handshake.headers.authorization;
    const bearerToken = typeof headerValue === 'string' && headerValue.startsWith('Bearer ')
      ? headerValue.slice(7)
      : undefined;
    const token = authToken || bearerToken;

    if (!token) {
      return next(new Error('Socket authentication required'));
    }

    const payload = verifyAccessToken(token) as any;
    if (!payload || typeof payload === 'string' || !payload.id || !payload.organizationId) {
      return next(new Error('Invalid socket token'));
    }

    const user = await prisma.users.findUnique({
      where: { id: payload.id },
      include: { organizations: true },
    });

    if (
      !user ||
      !user.is_active ||
      !user.organizations?.is_active ||
      user.organizationId !== payload.organizationId
    ) {
      return next(new Error('Unauthorized socket user'));
    }

    socket.data.userId = user.id;
    socket.data.organizationId = user.organizationId;
    socket.data.authenticated = true;
    next();
  } catch (error) {
    next(new Error('Socket authentication failed'));
  }
});

io.on('connection', (socket) => {
  if (!socket.data.authenticated || !socket.data.userId || !socket.data.organizationId) {
    logger.warn(`Rejecting unauthenticated socket connection: ${socket.id}`);
    socket.disconnect(true);
    return;
  }

  logger.info(`Client connected to real-time feed: ${socket.id}`);

  const organizationId = socket.data.organizationId as string | undefined;
  if (organizationId) {
    socket.join(`company_${organizationId}`);
    logger.info(`Client ${socket.id} joined verified room: company_${organizationId}`);
  }

  socket.on('join_company', (requestedOrganizationId) => {
    if (!organizationId || requestedOrganizationId !== organizationId) {
      logger.warn(`Socket ${socket.id} attempted invalid room join for org ${requestedOrganizationId}`);
      socket.disconnect(true);
      return;
    }

    socket.join(`company_${organizationId}`);
    logger.info(`Client ${socket.id} rejoined verified room: company_${organizationId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});


export { io };

const startServer = async () => {
  console.log('[BOOT] About to bind server');

  // Start listening FIRST so Render's health check passes immediately
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[BOOT] Server successfully listening on ${PORT}`);
    logger.info(`Server is running on port ${PORT}`);
  });

  // Migrations are handled by the start:render script before this process starts.
  // No need to run them again here.

  try {
    await initializePrisma();
    logger.info('Database layer initialized');

    // Run Redis connection checks asynchronously to prevent startup deadlocks
    redisHealthCheck()
      .then((redisReady) => {
        logger.info(`Redis health at startup check resolved: ${redisReady ? 'connected' : 'degraded'}`);
      })
      .catch((err) => {
        logger.error('Redis health check exception at boot:', err?.message || err);
      });

    console.log('[BOOT] Redis lifecycle continuing asynchronously');

    // Initialize Background Workers & Schedules (Non-blocking)
    setupConnectorWorkers();
    setupDriftWorker();
    setupScheduledJobs().catch(err => logger.error('Failed to setup scheduled jobs:', err));

    // SMTP Validation
    alertService.verifyConnection().catch(err => logger.error('SMTP Verification failed:', err));

    // Supabase Keep-Alive (Prevents auto-pausing on Free Tier)
    startDatabaseKeepAlive();
  } catch (error) {
    logger.error('Failed to initialize database — server will continue in degraded mode:', error);
    // Do NOT exit — the server is already listening and health/ready endpoints will report degraded
  }
};

/**
 * Periodically pings the database to prevent Supabase from pausing the project 
 * due to inactivity (7-day limit on Free Tier).
 */
const startDatabaseKeepAlive = () => {
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  
  logger.info('Database Keep-Alive service started (Interval: 24h)');
  
  setInterval(async () => {
    try {
      const db = await prisma;
      await db.$queryRaw`SELECT 1`;
      logger.info('Database Keep-Alive: Ping successful');
    } catch (error) {
      logger.error('Database Keep-Alive: Ping failed', error);
    }
  }, TWENTY_FOUR_HOURS);
};


if (process.env.NODE_ENV !== 'test') {
  startServer();
}

import 'dotenv/config';

// Hard-required: server cannot function without these
const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'REFRESH_SECRET',
];

const missing = REQUIRED_ENV_VARS.filter((v) => !process.env[v]);
if (missing.length > 0) {
  console.error(`[STARTUP FATAL] Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

// Soft warnings: system runs in degraded mode without these
if (!process.env.REDIS_URL) {
  console.warn('[STARTUP WARNING] REDIS_URL not set. Rate limiting and caching will use in-memory fallbacks.');
}
if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-placeholder') {
  console.warn('[STARTUP WARNING] OPENAI_API_KEY not set. AI summary features will be disabled.');
}


// Production-specific hardening
if (process.env.NODE_ENV === 'production') {
  if (!process.env.FRONTEND_URL) {
    console.error('[STARTUP FATAL] FRONTEND_URL is required in production');
    process.exit(1);
  }

  // Hard guard against demo mode in production
  if (process.env.VITE_DEMO_MODE === 'true') {
    console.error('[STARTUP FATAL] Demo mode (VITE_DEMO_MODE=true) is strictly forbidden in production environments.');
    process.exit(1);
  }

  // Prevent weak secrets
  if ((process.env.JWT_SECRET?.length ?? 0) < 32) {
    console.error('[STARTUP FATAL] JWT_SECRET must be at least 32 characters in production');
    process.exit(1);
  }
}
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app';
import logger from './utils/logger';
import prisma, { initializePrisma } from './config/db';
import { setupScheduledJobs } from './services/queue.service';
import { setupConnectorWorkers } from './workers/worker.manager';
import { alertService } from './services/alert.service';

const PORT = process.env.PORT || 3000;
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  logger.info(`Client connected to real-time feed: ${socket.id}`);
  
  socket.on('join_company', (organizationId) => {
    socket.join(`company_${organizationId}`);
    logger.info(`Client ${socket.id} joined room: company_${organizationId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});


export { io };

const startServer = async () => {
  // Start listening FIRST so Render's health check passes immediately
  httpServer.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
  });

  try {
    await initializePrisma();
    logger.info('Database layer initialized');

    // Initialize Background Workers & Schedules (Non-blocking)
    setupConnectorWorkers();
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

console.log('[BOOT] server.ts process starting, PORT:', process.env.PORT, 'NODE_ENV:', process.env.NODE_ENV);
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import logger from './utils/logger';
import { validateEnv } from './config/validateEnv';


import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app';
import prisma, { initializePrisma } from './config/db';
import { IntakeFormService } from './services/intakeForm.service';
import { setupScheduledJobs } from './services/queue.service';
import { setupConnectorWorkers, setupDriftWorker, setupEvaluationWorker } from './workers/worker.manager';
import { DriftBaselineService } from './services/driftBaseline.service';

import { alertService } from './services/alert.service';
import { verifyAccessToken } from './utils/jwt';
import { redisHealthCheck } from './config/redis';

import { createHttpTerminator } from 'http-terminator';
import { getRedisClient } from './config/redis';
import { exec } from 'child_process';

const PORT = Number.parseInt(process.env.PORT || '10000', 10);
const httpServer = createServer(app);
const httpTerminator = createHttpTerminator({ server: httpServer });
const workers: any[] = [];

export const shutdown = async (signal: string) => {
  logger.info({ signal }, 'Shutdown signal received');

  const forceExitTimer = setTimeout(() => {
    logger.error('Graceful shutdown timed out after 30s — forcing exit');
    process.exit(1);
  }, 30_000);

  try {
    await httpTerminator.terminate();
    await Promise.all(workers.filter(Boolean).map(w => w.close()));
    await prisma.$disconnect();
    const redis = getRedisClient();
    if (redis) {
      await redis.quit();
    }
    clearTimeout(forceExitTimer);
    logger.info('Graceful shutdown complete');
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Error during shutdown');
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

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
  try {
    await validateEnv();
  } catch (err: any) {
    logger.error('validateEnv failed:', err?.message || err);
    process.exit(1);
  }

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
    logger.error('\n' + '='.repeat(50));
    logger.error('[STARTUP FATAL] Missing required environment variables:');
    missing.forEach(v => logger.error(` - ${v}`));
    logger.error('Please ensure these are set in your Render dashboard or .env file.');
    logger.error('='.repeat(50) + '\n');
    process.exit(1);
  }

  // Soft warnings: system runs in degraded mode without these
  if (!process.env.REDIS_URL) {
    logger.warn('[STARTUP WARNING] REDIS_URL not set. Rate limiting and caching will use in-memory fallbacks.');
  }
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.length < 10) {
    logger.warn('[STARTUP WARNING] OPENAI_API_KEY not set. Semantic risk analysis will be disabled — pattern-based engines will enforce governance.');
  }
  if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length < 32) {
    logger.warn('[STARTUP WARNING] ENCRYPTION_KEY not set or too short. Connector credential encryption and connector workers may fail until this is configured.');
  }

  // Production-specific hardening
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.FRONTEND_URL) {
      logger.error('\n' + '!'.repeat(50));
      logger.error('[STARTUP FATAL] FRONTEND_URL is required in production.');
      logger.error('This is used for CORS and Secure Cookie configuration.');
      logger.error('!'.repeat(50) + '\n');
      process.exit(1);
    }

    // Guard against demo mode in production
    if (process.env.VITE_DEMO_MODE === 'true') {
      logger.warn('[STARTUP WARNING] Demo mode (VITE_DEMO_MODE=true) is active in production. This should only be used for testing.');
    }

    // Check secret strength
    if ((process.env.JWT_SECRET?.length ?? 0) < 32) {
      logger.warn('[STARTUP WARNING] JWT_SECRET is shorter than 32 characters. Consider using a stronger secret for production.');
    }
  }

  logger.info('[BOOT] About to bind server');

  httpServer.on('error', (err) => {
    logger.error({ err }, 'Server failed to start');
    process.exit(1);
  });

  const runMigrations = () => {
    return new Promise<void>((resolve, reject) => {
      logger.info('Starting database migrations in the background...');
      exec('npx prisma migrate deploy', (error, stdout, stderr) => {
        try {
          const logContent = {
            timestamp: new Date().toISOString(),
            success: !error,
            error: error ? { message: error.message, stack: error.stack } : null,
            stdout,
            stderr
          };
          fs.writeFileSync(path.join(process.cwd(), 'migration.json'), JSON.stringify(logContent, null, 2));
        } catch (writeErr: any) {
          logger.error(`Failed to write migration.json: ${writeErr.message}`);
        }

        if (error) {
          logger.error(`Migration command failed: ${error.message}`);
          return reject(error);
        }
        if (stderr) {
          logger.warn(`Migration stderr: ${stderr}`);
        }
        logger.info(`Migration stdout: ${stdout}`);
        logger.info('Database migrations completed successfully.');
        resolve();
      });
    });
  };

  const runBackgroundInit = async () => {
    // 1. Initialize Prisma first so the app works immediately
    try {
      await initializePrisma();
      logger.info('Database layer initialized');
    } catch (error) {
      logger.error('Failed to initialize database during background init:', error);
      return;
    }

    // 2. Run migrations asynchronously in the background in production without blocking
    if (process.env.NODE_ENV === 'production') {
      runMigrations().catch(migrationError => {
        logger.error('Background migration failed, keeping server alive:', migrationError);
      });
    }

    try {
      // Seed default intake forms for all existing organizations safely (check-and-upsert)
      await IntakeFormService.seedAllExistingOrganizations().catch(err => {
        logger.error('IntakeForm seeding failed:', err);
      });

      // Run Redis connection checks asynchronously to prevent startup deadlocks
      redisHealthCheck()
        .then((redisReady) => {
          logger.info(`Redis health at startup check resolved: ${redisReady ? 'connected' : 'degraded'}`);
        })
        .catch((err) => {
          logger.error('Redis health check exception at boot:', err?.message || err);
        });

      logger.info('[BOOT] Redis lifecycle continuing asynchronously');

      // Initialize Background Workers & Schedules (Non-blocking)
      const connWorker = setupConnectorWorkers();
      const driftWorker = setupDriftWorker();
      const evalWorker = setupEvaluationWorker();
      if (connWorker) workers.push(connWorker);
      if (driftWorker) workers.push(driftWorker);
      if (evalWorker) workers.push(evalWorker);
      setupScheduledJobs()
        .then(() => {
          // Backfill baselines for any existing agents with empty baselines
          prisma.ai_agents.findMany({
            where: { baselineSampledAt: null },
          }).then(async (agentsWithNoBaseline) => {
            if (agentsWithNoBaseline.length === 0) return;
            logger.info(`[STARTUP] Backfilling baselines for ${agentsWithNoBaseline.length} agents with no baseline...`);
            for (const agent of agentsWithNoBaseline) {
              try {
                await DriftBaselineService.computeBaseline(agent.id);
              } catch (err) {
                logger.error(`[STARTUP] Failed to backfill baseline for agent ${agent.id}:`, err);
              }
            }
            logger.info('[STARTUP] Baseline backfill complete.');
          }).catch(err => logger.error('[STARTUP] Baseline backfill query failed:', err));
        })
        .catch(err => logger.error('Failed to setup scheduled jobs:', err));

      // SMTP Validation
      alertService.verifyConnection().catch(err => logger.error('SMTP Verification failed:', err));

      // Supabase Keep-Alive (Prevents auto-pausing on Free Tier)
      startDatabaseKeepAlive();
    } catch (error) {
      logger.error('Failed to initialize database during background init:', error);
    }
  };

  // Start listening FIRST so Render's health check passes immediately
  httpServer.listen(PORT, '0.0.0.0', () => {
    logger.info(`[BOOT] Server listening on 0.0.0.0:${PORT}`);
    logger.info(`Server is running on port ${PORT}`);

    // Run database migrations and initialization in background
    runBackgroundInit();
  });
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

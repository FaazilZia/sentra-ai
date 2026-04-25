import 'dotenv/config';

// Production environment guard — must run before anything else
if (process.env.NODE_ENV === 'production') {
  const REQUIRED_ENV_VARS = [
    'DATABASE_URL',
    'JWT_SECRET',
    'REFRESH_SECRET',
    'FRONTEND_URL',
    'SENTRY_DSN',
  ];

  const missing = REQUIRED_ENV_VARS.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    console.error(`[STARTUP FATAL] Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  // Prevent weak secrets
  if ((process.env.JWT_SECRET?.length ?? 0) < 32) {
    console.error('[STARTUP FATAL] JWT_SECRET must be at least 32 characters');
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
  try {
    await initializePrisma();
    logger.info('Database layer initialized');

    // Initialize Background Workers & Schedules
    setupConnectorWorkers();
    await setupScheduledJobs();
    
    httpServer.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

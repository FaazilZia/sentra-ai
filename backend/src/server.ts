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

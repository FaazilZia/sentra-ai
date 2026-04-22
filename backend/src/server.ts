import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app';
import logger from './utils/logger';
import prisma, { initializePrisma } from './config/db';

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
  
  socket.on('join_company', (companyId) => {
    socket.join(`company_${companyId}`);
    logger.info(`Client ${socket.id} joined room: company_${companyId}`);
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

    // Initialize background jobs (Data Retention, etc.)
    const { setupScheduledJobs } = require('./services/queue.service');
    await setupScheduledJobs();
    logger.info('Background job workers initialized');
    
    httpServer.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

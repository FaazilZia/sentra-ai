import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import logger from './utils/logger';
import prisma from './config/db';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await prisma.$connect();
    logger.info('Connected to database successfully');
    
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

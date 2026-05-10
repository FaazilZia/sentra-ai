import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import logger from '../utils/logger';

/**
 * Enterprise Prisma Singleton
 * Optimized for serverless environments with pooled connections and fail-safe initialization.
 */

let prisma: PrismaClient;

export const initializePrisma = async () => {
  if (prisma) return prisma;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not defined in environment variables.');
  }

  try {
    const pool = new Pool({ 
      connectionString: databaseUrl,
      max: 20, // Limit pool size for serverless efficiency
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ 
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });

    // Test connection
    await prisma.$connect();
    logger.info('Database connection established successfully.');
    
    return prisma;
  } catch (error) {
    logger.error('Failed to initialize database connection:', error);
    throw error;
  }
};

/**
 * Fail-Safe Prisma Getter
 * Always ensures initialization before access.
 */
export const getPrisma = async (): Promise<PrismaClient> => {
  if (!prisma) {
    return await initializePrisma();
  }
  return prisma;
};

// Default export for backward compatibility
// Uses a proxy to ensure prisma is initialized before access
const prismaProxy = new Proxy({} as PrismaClient, {
  get: (target, prop) => {
    if (prop === 'then' || prop === 'catch' || prop === 'finally') return undefined;
    if (!prisma) {
      throw new Error("Prisma accessed before initialization. Call initializePrisma() first.");
    }
    return (prisma as any)[prop];
  }
});

export default prismaProxy;

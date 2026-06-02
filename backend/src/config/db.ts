import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import logger from '../utils/logger';

/**
 * Enterprise Prisma Singleton
 * Optimized for serverless environments with pooled connections and fail-safe initialization.
 */

const prismaContainer = {
  instance: undefined as PrismaClient | undefined
};

export const dbHealth = { isHealthy: false };

export const initializePrisma = async () => {
  if (prismaContainer.instance) return prismaContainer.instance;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not defined in environment variables.');
  }

  try {
    const pool = new Pool({ 
      connectionString: databaseUrl,
      max: Number(process.env.DB_POOL_MAX ?? 20),
      idleTimeoutMillis: Number(process.env.DB_POOL_IDLE_TIMEOUT_MS ?? 30_000),
      connectionTimeoutMillis: Number(process.env.DB_POOL_CONNECT_TIMEOUT_MS ?? 10_000),
    });

    const adapter = new PrismaPg(pool);
    prismaContainer.instance = new PrismaClient({ 
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });

    // Test connection
    await prismaContainer.instance.$connect();
    dbHealth.isHealthy = true;
    logger.info('Database connection established successfully.');
    
    return prismaContainer.instance;
  } catch (error) {
    dbHealth.isHealthy = false;
    logger.error('Failed to initialize database connection:', error);
    throw error;
  }
};

/**
 * Fail-Safe Prisma Getter
 * Always ensures initialization before access.
 */
export const getPrisma = async (): Promise<PrismaClient> => {
  if (!prismaContainer.instance) {
    return await initializePrisma();
  }
  return prismaContainer.instance;
};

// Default export for backward compatibility
// Uses a proxy to ensure prisma is initialized before access
const prismaProxy = new Proxy({} as PrismaClient, {
  get: (target, prop) => {
    if (prop === 'then' || prop === 'catch' || prop === 'finally') return undefined;
    if (!prismaContainer.instance) {
      throw new Error("Prisma accessed before initialization. Call initializePrisma() first.");
    }
    return (prismaContainer.instance as any)[prop];
  }
});

export default prismaProxy;

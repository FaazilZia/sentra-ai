import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { ZodError } from 'zod';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).context?.requestId;

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: err.issues,
      requestId
    });
  }

  logger.error(`[${requestId}] Unhandled Error:`, err);

  // Catch Database/Prisma specific errors
  if (err.code?.startsWith('P') || err.message?.includes('Prisma') || err.message?.includes('ECONNREFUSED')) {
    return res.status(503).json({
      success: false,
      message: 'Service temporarily unavailable. Our engineers are restoring connectivity.',
      requestId
    });
  }

  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    success: false,
    message,
    requestId,
  });
};

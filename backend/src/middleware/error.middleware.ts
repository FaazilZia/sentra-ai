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

  // Handle Prisma specific constraint & query errors
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      message: 'A record with this unique identifier already exists.',
      requestId
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: 'Requested record was not found.',
      requestId
    });
  }

  // Catch true Database Connection outages (P1000-P1017 or ECONNREFUSED)
  if (['P1000', 'P1001', 'P1002', 'P1003', 'P1017'].includes(err.code) || err.message?.includes('ECONNREFUSED')) {
    return res.status(503).json({
      success: false,
      message: 'Service temporarily unavailable. Our engineers are restoring connectivity.',
      requestId
    });
  }

  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production' && status === 500
    ? 'Internal Server Error'
    : err.message || 'Internal Server Error';

  res.status(status).json({
    success: false,
    message,
    requestId,
  });
};

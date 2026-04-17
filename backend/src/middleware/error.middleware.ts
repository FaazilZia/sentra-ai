import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

import { ZodError } from 'zod';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const requestId = req.context?.requestId;
  
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      requestId,
      errors: err.issues.map((e: any) => ({ path: e.path.join('.'), message: e.message }))
    });
  }

  logger.error(err.message, { stack: err.stack, requestId });

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    requestId,
    data: process.env.NODE_ENV === 'development' ? { stack: err.stack } : {},
  });
};

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

import * as Sentry from '@sentry/node';

export interface RequestContext {
  requestId: string;
  startTime: number;
}

declare global {
  namespace Express {
    interface Request {
      context: RequestContext;
    }
  }
}

export const contextMiddleware = (req: Request, res: Response, next: NextFunction) => {
  req.context = {
    requestId: randomUUID(),
    startTime: Date.now()
  };
  
  // Tag the request for observability
  Sentry.setTag('requestId', req.context.requestId);
  Sentry.setTag('endpoint', req.path);
  
  // Also set in response header for observability
  res.setHeader('X-Request-ID', req.context.requestId);
  
  next();
};

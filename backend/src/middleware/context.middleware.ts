import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

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
  
  // Also set in response header for observability
  res.setHeader('X-Request-ID', req.context.requestId);
  
  next();
};

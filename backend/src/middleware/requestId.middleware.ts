import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export const requestIdMiddleware = (req: any, res: Response, next: NextFunction) => {
  req.id = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  res.setHeader('x-request-id', req.id);
  next();
};

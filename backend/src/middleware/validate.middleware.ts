import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export const validate = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  const schemaShape = (schema as any)._def?.shape;
  const isWrapped = schemaShape?.body || schemaShape?.params || schemaShape?.query;
  
  const result = schema.safeParse(isWrapped ? { body: req.body, params: req.params, query: req.query } : req.body);
  
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid request', details: result.error.errors });
  }
  
  if (isWrapped) {
    if (result.data.body) req.body = result.data.body;
    if (result.data.params) req.params = result.data.params;
    if (result.data.query) req.query = result.data.query;
  } else {
    req.body = result.data;
  }
  
  next();
};

export const validateParams = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  const result = schema.safeParse(req.params);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid request', details: result.error.errors });
  }
  req.params = result.data;
  next();
};

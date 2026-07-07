import { Response, NextFunction } from 'express';

/**
 * 1. Try/catch wrapper - repeated in every controller:
 * asyncHandler(fn) utility wrapper
 */
export const asyncHandler = (fn: (req: any, res: Response, next: NextFunction) => Promise<any> | any) => {
  return (req: any, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 2. Error response formatting - repeated res.status(X).json({error/message}) patterns:
 * sendError(res, status, message) helper
 */
export const sendError = (res: Response, status: number, message: string) => {
  return res.status(status).json({ success: false, message });
};

/**
 * 2b. Success response formatting:
 * sendSuccess(res, data, status) helper
 */
export const sendSuccess = (res: Response, data: any, status: number = 200, message?: string) => {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    if ('success' in data) {
      return res.status(status).json(data);
    }
    if ('total' in data && 'page' in data) {
      return res.status(status).json({ success: true, ...data });
    }
  }
  const payload: any = { success: true };
  if (message) payload.message = message;
  if (data !== undefined) payload.data = data;
  return res.status(status).json(payload);
};

/**
 * 3. Org/tenant scoping - repeated orgId extraction from req.user:
 * getOrgId(req) helper
 */
export const getOrgId = (req: any): string => {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    throw new Error('Unauthorized');
  }
  return String(orgId);
};

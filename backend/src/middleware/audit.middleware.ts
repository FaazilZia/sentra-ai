import { Request, Response, NextFunction } from 'express';
import { auditLogger } from '../utils/auditLogger';

const AUDIT_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SKIP_PATHS = ['/health', '/ready', '/ping', '/metrics', '/api/v1/auth/refresh'];

/**
 * Automatically creates an audit log entry for all mutating HTTP requests.
 * Captures before/after resource state where possible.
 */
export const auditRequest = (req: any, res: Response, next: NextFunction) => {
  if (!AUDIT_METHODS.has(req.method)) return next();
  if (SKIP_PATHS.some((p) => req.path.startsWith(p))) return next();
  if (!req.user?.id) return next();

  const startTime = Date.now();

  res.on('finish', async () => {
    const success = res.statusCode >= 200 && res.statusCode < 400;
    const action = `${req.method}:${req.path}`;

    // Derive resource type from path
    const pathParts = req.path.split('/').filter(Boolean);
    const resourceType = pathParts[2] || pathParts[1] || 'unknown'; // e.g., /api/v1/policies → policies
    const resourceId = req.params?.id || req.params?.policyId || req.params?.agentId;

    await auditLogger.log({
      organizationId: req.user.organizationId,
      userId: req.user.id,
      action,
      eventType: 'USER_ACTION',
      severity: !success ? 'warn' : 'info',
      resourceType,
      resourceId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      sessionId: req.user.sessionId,
      outcome: success ? 'success' : 'failure',
      metadata: {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: Date.now() - startTime,
        body: sanitizeBody(req.body),
      },
    });
  });

  next();
};

/**
 * Remove sensitive fields from request body before logging.
 */
function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') return {};
  const SENSITIVE = new Set(['password', 'password_hash', 'token', 'secret', 'mfa_secret', 'key', 'credentials']);
  const clean: any = {};
  for (const [k, v] of Object.entries(body)) {
    clean[k] = SENSITIVE.has(k.toLowerCase()) ? '[REDACTED]' : v;
  }
  return clean;
}

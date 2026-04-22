import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import logger from '../utils/logger';
import { z } from 'zod';

const alertCache = new Map<string, number>();

export const securityObservability = async (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  let responseBody: any;

  res.send = function (body) {
    responseBody = body;
    return originalSend.call(this, body);
  };

  res.on('finish', async () => {
    if (res.statusCode === 403 || res.statusCode === 429) {
      const user = (req as any).user;
      const type = res.statusCode === 403 ? 'POLICY_VIOLATION' : 'RATE_LIMIT_EXCEEDED';
      
      const cacheKey = `${type}-${req.ip}-${user?.id || 'anon'}`;
      const now = Date.now();
      
      // Debounce identical alerts within 60 seconds to prevent DB flooding
      if (alertCache.has(cacheKey) && now - alertCache.get(cacheKey)! < 60000) {
        return;
      }
      alertCache.set(cacheKey, now);

      try {
        const severity = res.statusCode === 403 ? 'critical' : 'high';
        const message = res.statusCode === 403 
          ? `Blocked access attempt to ${req.originalUrl}` 
          : `Rate limit exceeded on ${req.originalUrl}`;
          
        await prisma.alerts.create({
          data: {
            type,
            message,
            severity,
            is_read: false,
          }
        });

        logger.warn(`Security Anomaly Detected [${severity.toUpperCase()}]: ${message}`, {
          ip: req.ip,
          userId: user?.id,
          method: req.method,
          url: req.originalUrl
        });

        // Slack Webhook Integration (HIGH and CRITICAL)
        if (process.env.SLACK_WEBHOOK_URL) {
          const emoji = severity === 'critical' ? '🔥' : '🚨';
          fetch(process.env.SLACK_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: `${emoji} *${severity.toUpperCase()} SECURITY ANOMALY* ${emoji}\n*Type:* ${type}\n*Message:* ${message}\n*IP:* ${req.ip}\n*User:* ${user?.id || 'Anonymous'}`
            })
          }).catch(err => logger.error('Failed to send Slack alert', err));
        }

        // Email Simulation (CRITICAL only)
        if (severity === 'critical') {
          logger.info(`[AUDIT] CRITICAL Alert routing to email: security-ops@sentra.ai - ${message}`);
        }

      } catch (err) {
        logger.error('Failed to log security anomaly to database', err);
      }
    }
  });

  next();
};

export const validateRequest = (schema: z.ZodObject<any, any>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Trigger a 403 or 400 for bad validation. 
        // Returning 403 will trigger our security anomaly hook.
        res.status(403).json({
          success: false,
          message: 'Invalid request payload or unauthorized structure.',
          errors: error.issues
        });
      } else {
        next(error);
      }
    }
  };
};

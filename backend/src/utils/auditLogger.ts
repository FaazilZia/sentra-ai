import prisma from '../config/db';
import logger from './logger';

export const auditLogger = {
  log: async ({
    userId,
    action,
    featureId,
    metadata
  }: {
    userId: string;
    action: 'LOGIN_SUCCESS' | 'ROLE_CHANGE' | 'POLICY_CREATED' | 'POLICY_UPDATED' | 'AGENT_REGISTERED' | string;
    featureId?: string;
    metadata?: any;
  }) => {
    try {
      await prisma.audit_logs.create({
        data: {
          user_id: userId,
          action,
          feature_id: featureId,
          metadata: metadata || {}
        }
      });
    } catch (err) {
      logger.error('Failed to write to audit_logs', err);
    }
  }
};

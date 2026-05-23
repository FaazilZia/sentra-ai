import prisma from '../config/db';
import logger from '../utils/logger';
import { ChangeEntityType, ChangeHistoryType } from '@prisma/client';

/**
 * Filter out unchanged fields, timestamps, and internal DB IDs from the diff object
 */
function getDiff(prevObj: any, newObj: any) {
  const prev: any = {};
  const next: any = {};

  const p = prevObj || {};
  const n = newObj || {};

  const noiseKeys = [
    'id', 'orgId', 'organizationId', 'userId', 'user_id', 
    'changedBy', 'created_at', 'updated_at', 'createdAt', 'updatedAt'
  ];

  const allKeys = new Set([...Object.keys(p), ...Object.keys(n)]);
  for (const key of allKeys) {
    if (noiseKeys.includes(key)) {
      continue;
    }
    const prevVal = p[key];
    const newVal = n[key];
    
    if (JSON.stringify(prevVal) !== JSON.stringify(newVal)) {
      if (prevVal !== undefined) prev[key] = prevVal;
      if (newVal !== undefined) next[key] = newVal;
    }
  }
  return { prev, next };
}

export const ChangeHistoryService = {
  /**
   * Log a new change history record
   */
  async logChange(
    orgId: string,
    entityType: ChangeEntityType,
    entityId: string,
    changedBy: string,
    changeType: ChangeHistoryType,
    previousValue?: any,
    newValue?: any,
    changeNote?: string
  ) {
    try {
      // 1. Calculate diff to only store modified keys
      let diffPrev: any = null;
      let diffNext: any = null;

      if (changeType === 'updated') {
        const { prev, next } = getDiff(previousValue, newValue);
        diffPrev = prev;
        diffNext = next;
      } else {
        // For created or deleted, strip noise keys
        const noiseKeys = [
          'id', 'orgId', 'organizationId', 'userId', 'user_id', 
          'changedBy', 'created_at', 'updated_at', 'createdAt', 'updatedAt'
        ];
        
        if (previousValue) {
          diffPrev = { ...previousValue };
          noiseKeys.forEach(k => delete diffPrev[k]);
        }
        if (newValue) {
          diffNext = { ...newValue };
          noiseKeys.forEach(k => delete diffNext[k]);
        }
      }

      // 2. Persist in database
      const history = await prisma.change_history.create({
        data: {
          orgId,
          entityType,
          entityId,
          changedBy,
          changeType,
          previousValue: diffPrev ? JSON.parse(JSON.stringify(diffPrev)) : null,
          newValue: diffNext ? JSON.parse(JSON.stringify(diffNext)) : null,
          changeNote: changeNote || null
        },
        include: {
          user: {
            select: { full_name: true, email: true }
          }
        }
      });

      logger.info(`[ChangeHistory] Successfully logged "${changeType}" for ${entityType}:${entityId} by user ${changedBy}`);
      return history;
    } catch (error) {
      logger.error('[ChangeHistory] Failed to log change history record:', error);
      return null;
    }
  },

  /**
   * Get full history timeline for a specific entity
   */
  async getChangeHistory(entityType: ChangeEntityType, entityId: string, orgId: string) {
    try {
      return await prisma.change_history.findMany({
        where: { orgId, entityType, entityId },
        include: {
          user: { select: { full_name: true, email: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      logger.error(`[ChangeHistory] Failed to load history for ${entityType}:${entityId}:`, error);
      return [];
    }
  },

  /**
   * Get recent change history records across all entities
   */
  async getRecentChanges(orgId: string, limit: number = 10) {
    try {
      return await prisma.change_history.findMany({
        where: { orgId },
        include: {
          user: { select: { full_name: true, email: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      });
    } catch (error) {
      logger.error(`[ChangeHistory] Failed to fetch recent changes for org ${orgId}:`, error);
      return [];
    }
  }
};

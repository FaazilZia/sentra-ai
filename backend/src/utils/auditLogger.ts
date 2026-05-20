import { createHash } from 'crypto';
import prisma from '../config/db';
import logger from '../utils/logger';
import { getRedisClient } from '../config/redis';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface AuditLogEntry {
  organizationId: string;
  userId: string;
  action: string;
  featureId?: string;
  metadata?: Record<string, any>;
  eventType?: string;
  severity?: string;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  outcome?: string;
}

// ─────────────────────────────────────────────
// Hash Chain Builder
// ─────────────────────────────────────────────

function buildEntryHash(entry: Omit<AuditLogEntry, 'organizationId'> & { prevHash?: string; timestamp: Date }): string {
  const content = JSON.stringify({
    userId: entry.userId,
    action: entry.action,
    metadata: entry.metadata,
    timestamp: entry.timestamp.toISOString(),
    prevHash: entry.prevHash || 'GENESIS',
  });
  return createHash('sha256').update(content).digest('hex');
}

// Cache the last hash per org to avoid repeated DB lookups
const lastHashCache = new Map<string, string>();

async function getPrevHash(organizationId: string): Promise<string> {
  // Check in-memory cache first
  if (lastHashCache.has(organizationId)) return lastHashCache.get(organizationId)!;

  const last = await prisma.audit_logs.findFirst({
    where: { organizationId },
    orderBy: { timestamp: 'desc' },
    select: { entry_hash: true },
  });
  return last?.entry_hash || 'GENESIS';
}

// ─────────────────────────────────────────────
// Immutable Audit Logger
// ─────────────────────────────────────────────

export const auditLogger = {
  /**
   * Write an immutable, hash-chained audit log entry.
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      const timestamp = new Date();
      const prevHash = await getPrevHash(entry.organizationId);
      const entryHash = buildEntryHash({ ...entry, prevHash, timestamp });

      const record = await prisma.audit_logs.create({
        data: {
          organizationId: entry.organizationId,
          user_id: entry.userId,
          action: entry.action,
          feature_id: entry.featureId,
          metadata: entry.metadata || {},
          timestamp,
          prev_hash: prevHash,
          entry_hash: entryHash,
          event_type: entry.eventType || 'USER_ACTION',
          severity: entry.severity || 'info',
          resource_type: entry.resourceType,
          resource_id: entry.resourceId,
          ip_address: entry.ipAddress,
          user_agent: entry.userAgent,
          session_id: entry.sessionId,
          outcome: entry.outcome || 'success',
        },
      });

      // Update cache
      lastHashCache.set(entry.organizationId, entryHash);

    } catch (err) {
      logger.error('[AuditLogger] Failed to write audit log:', err);
    }
  },

  // Backward-compatible shim for old callers
  async logLegacy(params: {
    userId: string;
    organizationId: string;
    action: string;
    featureId?: string;
    metadata?: any;
  }) {
    return this.log({
      organizationId: params.organizationId,
      userId: params.userId,
      action: params.action,
      featureId: params.featureId,
      metadata: params.metadata,
    });
  },
};

// ─────────────────────────────────────────────
// Audit Service (queries + export + verify)
// ─────────────────────────────────────────────

export const AuditService = {
  async getLogs(organizationId: string, filters: {
    eventType?: string;
    userId?: string;
    resourceType?: string;
    resourceId?: string;
    severity?: string;
    fromDate?: Date;
    toDate?: Date;
    page?: number;
    limit?: number;
    search?: string;
  } = {}) {
    const { page = 1, limit = 50, ...rest } = filters;
    const skip = (page - 1) * limit;

    const where: any = { organizationId };
    if (rest.eventType) where.event_type = rest.eventType;
    if (rest.userId) where.user_id = rest.userId;
    if (rest.resourceType) where.resource_type = rest.resourceType;
    if (rest.resourceId) where.resource_id = rest.resourceId;
    if (rest.severity) where.severity = rest.severity;
    if (rest.fromDate || rest.toDate) {
      where.timestamp = {};
      if (rest.fromDate) where.timestamp.gte = rest.fromDate;
      if (rest.toDate) where.timestamp.lte = rest.toDate;
    }
    if (rest.search) {
      where.OR = [
        { action: { contains: rest.search, mode: 'insensitive' } },
        { resource_type: { contains: rest.search, mode: 'insensitive' } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.audit_logs.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
        include: { user: { select: { full_name: true, email: true } } },
      }),
      prisma.audit_logs.count({ where }),
    ]);

    return { logs, total, page, limit, pages: Math.ceil(total / limit) };
  },

  /**
   * Verify the hash chain integrity for an organization's audit logs.
   * Returns true if unbroken, or the first broken entry.
   */
  async verifyChainIntegrity(organizationId: string): Promise<{
    valid: boolean;
    totalChecked: number;
    brokenAt?: string;
    brokenAction?: string;
  }> {
    const logs = await prisma.audit_logs.findMany({
      where: { organizationId },
      orderBy: { timestamp: 'asc' },
      select: { id: true, prev_hash: true, entry_hash: true, action: true, user_id: true, metadata: true, timestamp: true },
    });

    let prevHash = 'GENESIS';
    for (const log of logs) {
      const expectedHash = buildEntryHash({
        userId: log.user_id,
        action: log.action,
        metadata: log.metadata as any,
        prevHash: log.prev_hash || 'GENESIS',
        timestamp: log.timestamp,
      });

      if (log.entry_hash && log.entry_hash !== expectedHash) {
        return { valid: false, totalChecked: logs.indexOf(log) + 1, brokenAt: log.id, brokenAction: log.action };
      }

      if (log.prev_hash && log.prev_hash !== prevHash) {
        return { valid: false, totalChecked: logs.indexOf(log) + 1, brokenAt: log.id, brokenAction: log.action };
      }

      prevHash = log.entry_hash || prevHash;
    }

    return { valid: true, totalChecked: logs.length };
  },

  /**
   * Export audit logs as CSV or JSON.
   */
  async exportLogs(organizationId: string, format: 'csv' | 'json' = 'json', filters: any = {}) {
    const result = await this.getLogs(organizationId, { ...filters, limit: 10000, page: 1 });

    if (format === 'json') {
      return JSON.stringify(result.logs, null, 2);
    }

    // CSV format
    const headers = ['id', 'timestamp', 'user_id', 'action', 'event_type', 'severity', 'resource_type', 'resource_id', 'outcome', 'ip_address'];
    const rows = result.logs.map((log: any) => headers.map((h) => JSON.stringify((log as any)[h] || '')).join(','));
    return [headers.join(','), ...rows].join('\n');
  },

  /**
   * Get audit statistics for an org.
   */
  async getStats(organizationId: string) {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [total, last24hCount, byEventType, bySeverity] = await Promise.all([
      prisma.audit_logs.count({ where: { organizationId } }),
      prisma.audit_logs.count({ where: { organizationId, timestamp: { gte: last24h } } }),
      prisma.audit_logs.groupBy({ by: ['event_type'], where: { organizationId }, _count: { id: true } }),
      prisma.audit_logs.groupBy({ by: ['severity'], where: { organizationId }, _count: { id: true } }),
    ]);

    return { total, last24h: last24hCount, byEventType, bySeverity };
  },
};

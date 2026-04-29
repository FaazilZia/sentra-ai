import prisma from '../config/db';
import { subDays, startOfDay } from 'date-fns';

/**
 * Enterprise Intelligence & Analytics Service
 * Converts raw audit logs into actionable security insights.
 */

export class IntelligenceService {
  /**
   * Get High-Level Governance Metrics
   */
  static async getExecutiveMetrics(organizationId: string) {
    const thirtyDaysAgo = subDays(new Date(), 30);

    const [auditCounts, interceptCounts] = await Promise.all([
      Promise.all([
        prisma.logs.count({ where: { organizationId, timestamp: { gte: thirtyDaysAgo } } }),
        prisma.logs.count({ where: { organizationId, status: 'blocked', timestamp: { gte: thirtyDaysAgo } } }),
        prisma.logs.count({ where: { organizationId, risk: 'high', timestamp: { gte: thirtyDaysAgo } } })
      ]),
      Promise.all([
        prisma.interception_logs.count({ where: { organizationId, timestamp: { gte: thirtyDaysAgo } } }),
        prisma.interception_logs.count({ where: { organizationId, decision: 'BLOCK', timestamp: { gte: thirtyDaysAgo } } }),
        prisma.interception_logs.count({ where: { organizationId, decision: 'BLOCK', timestamp: { gte: thirtyDaysAgo } } })
      ])
    ]);

    const totalActions = auditCounts[0] + interceptCounts[0];
    const blockedActions = auditCounts[1] + interceptCounts[1];
    const highRiskActions = auditCounts[2] + interceptCounts[2];

    const blockRate = totalActions > 0 ? (blockedActions / totalActions) * 100 : 0;

    return {
      period: '30d',
      totalActions,
      blockedActions,
      highRiskActions,
      blockRate: parseFloat(blockRate.toFixed(2)),
      safetyScore: Math.max(0, 100 - (blockRate * 2))
    };
  }

  static async getTopAttackPatterns(organizationId: string) {
    const sevenDaysAgo = subDays(new Date(), 7);
    const [auditLogs, interceptLogs] = await Promise.all([
      prisma.logs.findMany({
        where: { organizationId, status: 'blocked', timestamp: { gte: sevenDaysAgo } },
        select: { metadata: true }
      }),
      prisma.interception_logs.findMany({
        where: { organizationId, decision: 'BLOCK', timestamp: { gte: sevenDaysAgo } },
        select: { metadata: true }
      })
    ]);

    const patterns: Record<string, number> = {};
    [...auditLogs, ...interceptLogs].forEach((log: any) => {
      const category = (log.metadata as any)?.categories?.[0] || 'Unknown Violation';
      patterns[category] = (patterns[category] || 0) + 1;
    });

    return Object.entries(patterns)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  static async getRiskTrend(organizationId: string, days: number = 7) {
    const startDate = subDays(startOfDay(new Date()), days);
    const [auditLogs, interceptLogs] = await Promise.all([
      prisma.logs.findMany({
        where: { organizationId, timestamp: { gte: startDate } },
        select: { timestamp: true, risk: true }
      }),
      prisma.interception_logs.findMany({
        where: { organizationId, timestamp: { gte: startDate } },
        select: { timestamp: true, decision: true }
      })
    ]);

    const timeline: Record<string, { total: number, high: number }> = {};
    
    auditLogs.forEach((log: any) => {
      const date = log.timestamp.toISOString().split('T')[0];
      if (!timeline[date]) timeline[date] = { total: 0, high: 0 };
      timeline[date].total++;
      if (log.risk === 'high') timeline[date].high++;
    });

    interceptLogs.forEach((log: any) => {
      const date = log.timestamp.toISOString().split('T')[0];
      if (!timeline[date]) timeline[date] = { total: 0, high: 0 };
      timeline[date].total++;
      if (log.decision === 'BLOCK') timeline[date].high++;
    });

    return Object.entries(timeline).map(([date, stats]) => ({
      date,
      ...stats
    })).sort((a, b) => a.date.localeCompare(b.date));
  }
}

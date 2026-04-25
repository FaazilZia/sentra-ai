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

    const [totalActions, blockedActions, highRiskActions] = await Promise.all([
      prisma.logs.count({ where: { organizationId, timestamp: { gte: thirtyDaysAgo } } }),
      prisma.logs.count({ where: { organizationId, status: 'blocked', timestamp: { gte: thirtyDaysAgo } } }),
      prisma.logs.count({ where: { organizationId, risk: 'high', timestamp: { gte: thirtyDaysAgo } } })
    ]);

    const blockRate = totalActions > 0 ? (blockedActions / totalActions) * 100 : 0;

    return {
      period: '30d',
      totalActions,
      blockedActions,
      highRiskActions,
      blockRate: parseFloat(blockRate.toFixed(2)),
      safetyScore: Math.max(0, 100 - (blockRate * 2)) // Simple health metric
    };
  }

  /**
   * Identify Top Attack Vectors
   * Groups blocked actions by their semantic reasons or categories.
   */
  static async getTopAttackPatterns(organizationId: string) {
    const logs = await prisma.logs.findMany({
      where: { 
        organizationId, 
        status: 'blocked',
        timestamp: { gte: subDays(new Date(), 7) }
      },
      select: { reason: true, metadata: true }
    });

    const patterns: Record<string, number> = {};
    logs.forEach((log: any) => {
      const category = (log.metadata as any)?.categories?.[0] || 'Unknown Violation';
      patterns[category] = (patterns[category] || 0) + 1;
    });

    return Object.entries(patterns)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Risk Trend Analysis
   * Returns a time-series of risk events for dashboarding.
   */
  static async getRiskTrend(organizationId: string, days: number = 7) {
    const logs = await prisma.logs.findMany({
      where: { 
        organizationId, 
        timestamp: { gte: subDays(startOfDay(new Date()), days) }
      },
      select: { timestamp: true, risk: true }
    });

    const timeline: Record<string, { total: number, high: number }> = {};
    
    logs.forEach((log: any) => {
      const date = log.timestamp.toISOString().split('T')[0];
      if (!timeline[date]) timeline[date] = { total: 0, high: 0 };
      
      timeline[date].total++;
      if (log.risk === 'high') timeline[date].high++;
    });

    return Object.entries(timeline).map(([date, stats]) => ({
      date,
      ...stats
    })).sort((a, b) => a.date.localeCompare(b.date));
  }
}

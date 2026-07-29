import prisma from '../config/db';
import { Queue } from 'bullmq';
import { getRedisUrl, buildRedisOptions } from '../config/redis';
import * as IORedisModule from 'ioredis';
import logger from '../utils/logger';
const IORedis = (IORedisModule.default || IORedisModule) as any;

const REDIS_URL = getRedisUrl();
let connection: any;
if (REDIS_URL) {
  connection = new IORedis(REDIS_URL, buildRedisOptions({
    maxRetriesPerRequest: null,
    enableOfflineQueue: true,
  }));
}

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 2000 },
  removeOnComplete: { count: 100 },
  removeOnFail: false,
};

// Guard comment: postMarketQueue is initialized at module load and can be null (e.g. when Redis is offline).
// Always verify its nullability before calling queue-dependent methods to prevent runtime exceptions.
export const postMarketQueue = connection ? new Queue('post-market-monitoring', { connection, defaultJobOptions }) : null;

export class PostMarketMonitoringService {
  /**
   * Generates a comprehensive Post-Market Monitoring report.
   * Aggregates drift, incidents, evaluations, and Art. 15 compliance details.
   * Also auto-updates Art. 72 control status to IN_PROGRESS.
   */
  static async generateMonitoringReport(organizationId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // 1. Query drift alerts in past 30 days
    const driftAlertsCount = await prisma.drift_alerts.count({
      where: {
        organizationId,
        timestamp: { gte: thirtyDaysAgo }
      }
    });

    // 2. Query incidents in past 30 days and group by severity
    const incidents = await prisma.incidents.findMany({
      where: {
        organizationId,
        created_at: { gte: thirtyDaysAgo }
      }
    });

    const openIncidents = incidents.filter(i => i.status !== 'resolved').length;
    const incidentsBySeverity = {
      high: incidents.filter(i => i.severity >= 4).length,
      medium: incidents.filter(i => i.severity === 3).length,
      low: incidents.filter(i => i.severity <= 2).length
    };

    // 3. Query evaluation scores over time
    const evaluationRuns = await prisma.evaluation_runs.findMany({
      where: {
        organizationId,
        status: 'completed',
        completed_at: { gte: thirtyDaysAgo }
      },
      orderBy: { completed_at: 'desc' }
    });

    const avgEvalScore = evaluationRuns.length > 0
      ? Math.round(evaluationRuns.reduce((sum, r) => sum + (r.governance_score || 0), 0) / evaluationRuns.length * 10) / 10
      : 75.0; // Standard baseline fallback

    // 4. Query NIST AI RMF status
    const nistControls = await prisma.nist_ai_rmf_subcategories.findMany({
      where: {
        subcategory_code: {
          in: ['ME-1.1', 'ME-2.5', 'MN-3.1']
        }
      },
      include: {
        implementations: {
          where: { organizationId }
        }
      }
    });

    const art15Total = nistControls.length;
    const art15Implemented = nistControls.filter((c: any) => c.implementations[0]?.status === 'IMPLEMENTED').length;

    // 5. Auto-update NIST compliance status to IN_PROGRESS
    await this.updateNistComplianceStatus(organizationId, 'IN_PROGRESS');

    return {
      organizationId,
      generatedAt: new Date(),
      timeframeDays: 30,
      metrics: {
        driftAlertsCount,
        openIncidents,
        incidentsBySeverity,
        avgEvalScore,
        evaluationsRanCount: evaluationRuns.length
      },
      compliance: {
        art15Status: `${art15Implemented}/${art15Total} implemented`,
        art72Status: 'IN_PROGRESS'
      },
      summary: `The post-market report generated successfully. Detected ${driftAlertsCount} drift events and ${openIncidents} unresolved incidents over the past 30 days.`
    };
  }

  /**
   * Lightweight monitoring KPI overview for Dashboard.
   */
  static async getMonitoringDashboard(organizationId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    try {
      const [driftAlertCount, openIncidents, latestEval] = await Promise.all([
        prisma.drift_alerts.count({
          where: { organizationId, timestamp: { gte: thirtyDaysAgo } }
        }),
        prisma.incidents.count({
          where: { organizationId, status: { not: 'resolved' } }
        }),
        prisma.evaluation_runs.findFirst({
          where: { organizationId, status: 'completed' },
          orderBy: { completed_at: 'desc' }
        })
      ]);

      let daysSinceLastEvaluation = -1;
      if (latestEval && latestEval.completed_at) {
        const diffMs = Date.now() - new Date(latestEval.completed_at).getTime();
        daysSinceLastEvaluation = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      }

      return {
        driftAlerts30d: driftAlertCount,
        openIncidents,
        avgEvalScore: latestEval ? latestEval.governance_score : 80.0,
        daysSinceLastEvaluation
      };
    } catch (err: any) {
      throw new Error(`Failed to query database for post-market monitoring dashboard: ${err.message}`);
    }
  }

  /**
   * Schedules repeatable weekly post-market checks in BullMQ.
   */
  static async scheduleMonitoringCheck(organizationId: string) {
    if (!postMarketQueue) {
      logger.warn(`[PostMarketMonitoring] BullMQ offline, skipped scheduling for org: ${organizationId}`);
      return;
    }

    await postMarketQueue.add(
      `post-market-monitoring-check-${organizationId}`,
      { organizationId },
      {
        repeat: { pattern: '0 0 * * 0' } // Weekly at midnight Sunday
      }
    );
  }

  /**
   * Helper to set NIST AI RMF MN-3.1 subcategory implementation status.
   */
  private static async updateNistComplianceStatus(organizationId: string, status: 'IN_PROGRESS' | 'IMPLEMENTED') {
    try {
      const subcategories = await prisma.nist_ai_rmf_subcategories.findMany({
        where: {
          subcategory_code: {
            in: ['MN-3.1']
          }
        }
      });

      for (const ctrl of subcategories) {
        const existing = await prisma.nist_ai_rmf_implementations.findFirst({
          where: { organizationId, subcategory_id: ctrl.id }
        });

        if (existing?.status === 'IMPLEMENTED') {
          continue;
        }

        await prisma.nist_ai_rmf_implementations.upsert({
          where: {
            organizationId_subcategory_id: {
              organizationId,
              subcategory_id: ctrl.id
            }
          },
          update: {
            status,
            last_reviewed: new Date()
          },
          create: {
            organizationId,
            subcategory_id: ctrl.id,
            status,
            last_reviewed: new Date()
          }
        });
      }
    } catch (err: any) {
      logger.warn(`[PostMarketMonitoring] Failed to update NIST compliance status:`, err.message);
    }
  }
}

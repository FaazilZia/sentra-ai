import prisma from '../config/db';
import { Queue } from 'bullmq';
import { getRedisUrl, buildRedisOptions } from '../config/redis';
import * as IORedisModule from 'ioredis';
const IORedis = (IORedisModule.default || IORedisModule) as any;

const REDIS_URL = getRedisUrl();
let connection: any;
if (REDIS_URL) {
  connection = new IORedis(REDIS_URL, buildRedisOptions({
    maxRetriesPerRequest: null,
    enableOfflineQueue: true,
  }));
}

export const postMarketQueue = connection ? new Queue('post-market-monitoring', { connection }) : null;

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

    // 4. Query EU AI Act Art. 15 status (Accuracy, Robustness, Cybersecurity)
    const art15Controls = await prisma.eu_ai_act_controls.findMany({
      where: {
        control_code: {
          in: ['EU-AIA-15-1', 'EU-AIA-15-2', 'EU-AIA-15-3']
        }
      },
      include: {
        implementations: {
          where: { organizationId }
        }
      }
    });

    const art15Total = art15Controls.length;
    const art15Implemented = art15Controls.filter(c => c.implementations[0]?.status === 'IMPLEMENTED').length;

    // 5. Auto-update EU AI Act Art. 72 implementation status to IN_PROGRESS
    await this.updateArt72ComplianceStatus(organizationId, 'IN_PROGRESS');

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
  }

  /**
   * Schedules repeatable weekly post-market checks in BullMQ.
   */
  static async scheduleMonitoringCheck(organizationId: string) {
    if (!postMarketQueue) {
      console.warn(`[PostMarketMonitoring] BullMQ offline, skipped scheduling for org: ${organizationId}`);
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
   * Helper to set EU AI Act Art. 72 control implementation status.
   */
  private static async updateArt72ComplianceStatus(organizationId: string, status: 'IN_PROGRESS' | 'IMPLEMENTED') {
    try {
      const controls = await prisma.eu_ai_act_controls.findMany({
        where: {
          control_code: {
            in: ['EU-AIA-72-1', 'EU-AIA-72-2']
          }
        }
      });

      for (const ctrl of controls) {
        // Upsert to status unless already marked IMPLEMENTED
        const existing = await prisma.eu_ai_act_implementations.findFirst({
          where: { organizationId, control_id: ctrl.id }
        });

        if (existing?.status === 'IMPLEMENTED') {
          continue; // Keep implemented
        }

        await prisma.eu_ai_act_implementations.upsert({
          where: {
            organizationId_control_id: {
              organizationId,
              control_id: ctrl.id
            }
          },
          update: {
            status,
            last_reviewed: new Date()
          },
          create: {
            organizationId,
            control_id: ctrl.id,
            status,
            evidence_links: [],
            last_reviewed: new Date()
          }
        });
      }
    } catch (err: any) {
      console.warn(`[PostMarketMonitoring] Failed to update Art. 72 compliance row status:`, err.message);
    }
  }
}

import prisma from '../config/db';
import logger from '../utils/logger';
import { EventTriggerService } from './eventTrigger.service';
import axios from 'axios';

export class DriftService {
  /**
   * Detects unusual spikes in agent activity.
   * Logic: if (actions_last_60_min > (avg_hourly_actions_last_7_days * 2)) { trigger alert }
   */
  static async checkAgentDrift(organizationId: string, agentId: string) {
    try {
      const now = new Date();
      const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // 1. Calculate actions in the last 60 minutes
      const actionsLast60Min = await prisma.interception_logs.count({
        where: {
          organizationId,
          user_id: agentId,
          timestamp: { gte: lastHour }
        }
      });

      // 2. Calculate average hourly actions over the last 7 days
      const actionsLast7Days = await prisma.interception_logs.count({
        where: {
          organizationId,
          user_id: agentId,
          timestamp: { gte: last7Days }
        }
      });

      const avgHourlyActions = actionsLast7Days / (7 * 24);
      const threshold = Math.max(10, avgHourlyActions * 2); 

      if (actionsLast60Min > threshold) {
        logger.warn(`Anomalous activity detected for agent ${agentId} in org ${organizationId}`);
        
        await prisma.drift_alerts.create({
          data: {
            organizationId,
            agentId,
            type: 'ANOMALOUS_ACTIVITY',
            severity: 'high',
            description: `Agent activity spike: ${actionsLast60Min} actions/hr (Baseline: ${avgHourlyActions.toFixed(2)}/hr)`,
            status: 'open'
          }
        });

        const rules = await prisma.alert_rules.findMany({
          where: { organizationId }
        });

        for (const rule of rules) {
          try {
            await axios.post(rule.webhook_url, {
              event: "ANOMALOUS_ACTIVITY",
              agent_id: agentId,
              current_activity: actionsLast60Min,
              baseline_activity: avgHourlyActions.toFixed(2),
              timestamp: new Date().toISOString()
            }, { timeout: 5000 });
          } catch (err) {
            logger.error(`Failed to send drift webhook for rule ${rule.id}`, err);
          }
        }
      }
    } catch (err) {
      logger.error('Drift detection error:', err);
    }
  }

  static async listAlerts(organizationId: string) {
    return await prisma.drift_alerts.findMany({
      where: { organizationId },
      orderBy: { timestamp: 'desc' }
    });
  }

  static async resolveAlert(id: string, organizationId: string) {
    return await prisma.drift_alerts.updateMany({
      where: { id, organizationId },
      data: { status: 'resolved' }
    });
  }

  static async detectDrift(organizationId: string) {
    // Manually trigger checks for all agents in the org
    const agents = await prisma.interception_logs.groupBy({
      by: ['user_id'],
      where: { organizationId },
    });

    for (const agent of agents) {
      await this.checkAgentDrift(organizationId, agent.user_id);
    }

    return await this.listAlerts(organizationId);
  }
}

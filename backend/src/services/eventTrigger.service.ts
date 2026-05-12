import prisma from '../config/db';
import logger from '../utils/logger';
import axios from 'axios';

export class EventTriggerService {
  /**
   * Evaluate whether recent blocked interceptions should trigger an alert for an organization.
   */
  static async evaluateThresholds(organizationId: string) {
    try {
      // Find all alert rules for the org
      const rules = await prisma.alert_rules.findMany({
        where: { organizationId }
      });

      if (!rules.length) return;

      const now = new Date();

      for (const rule of rules) {
        const timeWindowStart = new Date(now.getTime() - rule.time_window_minutes * 60000);

        // Count blocked events within the time window
        const blockedCount = await prisma.interception_logs.count({
          where: {
            organizationId,
            decision: 'BLOCK',
            timestamp: { gte: timeWindowStart }
          }
        });

        if (blockedCount >= rule.threshold_count) {
          if (!this.canTriggerRule(rule.id, rule.time_window_minutes)) {
            continue;
          }

          // Fetch the most recent blocked prompt for context
          const latestLog = await prisma.interception_logs.findFirst({
            where: {
              organizationId,
              decision: 'BLOCK',
              timestamp: { gte: timeWindowStart }
            },
            orderBy: { timestamp: 'desc' },
            select: { input_text: true, reason: true }
          });

          this.triggerWebhook(rule, blockedCount, latestLog?.input_text || "N/A", latestLog?.reason || "N/A");
          this.markRuleTriggered(rule.id);
        }
      }
    } catch (err) {
      logger.error('Failed to evaluate event thresholds', err);
    }
  }

  private static lastTriggered = new Map<string, Date>();

  private static canTriggerRule(ruleId: string, windowMinutes: number): boolean {
    const last = this.lastTriggered.get(ruleId);
    if (!last) return true;
    
    // Cooldown is equal to the time window to prevent continuous spam within the same window
    const cooldownMs = windowMinutes * 60000;
    return (new Date().getTime() - last.getTime()) > cooldownMs;
  }

  private static markRuleTriggered(ruleId: string) {
    this.lastTriggered.set(ruleId, new Date());
  }

  private static async triggerWebhook(rule: any, blockedCount: number, sampleContext: string, reason: string) {
    try {
      await axios.post(rule.webhook_url, {
        event: "HIGH_RISK_ACTIVITY",
        blocked_count: blockedCount,
        time_window_minutes: rule.time_window_minutes,
        action_type: "AGENT_ACTION",
        sample_context: sampleContext,
        reason: reason,
        timestamp: new Date().toISOString()
      }, { timeout: 5000 });
      logger.info(`Webhook triggered successfully for rule ${rule.id}`);
    } catch (err) {
      logger.error(`Webhook delivery failed for rule ${rule.id}`, err);
    }
  }
}

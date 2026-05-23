import prisma from '../config/db';
import logger from '../utils/logger';
import { IncomingWebhook } from '@slack/webhook';

export const SlackService = {
  /**
   * Fetch Slack Configuration for an organization
   */
  async getConfig(orgId: string) {
    try {
      return await prisma.slack_config.findUnique({
        where: { orgId }
      });
    } catch (error) {
      logger.error(`[SlackService] Failed to get config for org ${orgId}:`, error);
      return null;
    }
  },

  /**
   * Save (Upsert) Slack Configuration for an organization
   */
  async saveConfig(orgId: string, data: { webhookUrl: string; channel: string; enabled?: boolean; notifyOn: string[] }) {
    try {
      return await prisma.slack_config.upsert({
        where: { orgId },
        update: {
          webhookUrl: data.webhookUrl,
          channel: data.channel,
          enabled: data.enabled ?? true,
          notifyOn: data.notifyOn
        },
        create: {
          orgId,
          webhookUrl: data.webhookUrl,
          channel: data.channel,
          enabled: data.enabled ?? true,
          notifyOn: data.notifyOn
        }
      });
    } catch (error) {
      logger.error(`[SlackService] Failed to save config for org ${orgId}:`, error);
      throw error;
    }
  },

  /**
   * Delete Slack Configuration
   */
  async deleteConfig(orgId: string) {
    try {
      await prisma.slack_config.delete({
        where: { orgId }
      });
      return true;
    } catch (error) {
      logger.error(`[SlackService] Failed to delete config for org ${orgId}:`, error);
      throw error;
    }
  },

  /**
   * Core Slack message delivery
   */
  async sendSlackMessage(orgId: string, text: string, blocks?: any[]) {
    try {
      const config = await this.getConfig(orgId);
      if (!config || !config.enabled || !config.webhookUrl) {
        logger.debug(`[SlackService] Skipping message: Slack not configured or disabled for org ${orgId}`);
        return false;
      }

      const webhook = new IncomingWebhook(config.webhookUrl);
      await webhook.send({
        text,
        channel: config.channel,
        blocks
      });
      logger.info(`[SlackService] Successfully sent Slack alert to channel ${config.channel} for org ${orgId}`);
      return true;
    } catch (error) {
      logger.error(`[SlackService] Failed to send message to Slack for org ${orgId}:`, error);
      return false;
    }
  },

  /**
   * Test webhook connectivity
   */
  async testConnection(webhookUrl: string, channel: string) {
    try {
      const webhook = new IncomingWebhook(webhookUrl);
      await webhook.send({
        text: '🔔 *Sentra AI Slack Integration Test* \nConnection successful! This channel is now active for compliance alerts.',
        channel,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '🔔 Sentra AI Integration Test',
              emoji: true
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: 'Slack integration is now *successfully connected* and ready to forward automated compliance actions!'
            }
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: 'Sentra AI Security Ledger • Webhook Test'
              }
            ]
          }
        ]
      });
      return true;
    } catch (error) {
      logger.error('[SlackService] Connection test failed:', error);
      throw error;
    }
  },

  /**
   * Scoped Trigger: Guardrail Action Blocked
   */
  async notifyGuardrailBlock(orgId: string, agentName: string, action: string, policyName: string) {
    const config = await this.getConfig(orgId);
    if (!config || !config.enabled || !config.notifyOn.includes('guardrail_block')) return;

    const title = '🛡️ Sentra AI Guardrail Interception Alert';
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🛡️ Guardrail Block Alert',
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `An action has been intercepted and *blocked* by system policies.\n\n*Agent:* \`${agentName}\`\n*Action:* \`${action}\`\n*Policy Triggered:* \`${policyName || 'System Hardening Rule'}\``
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: 'Severity: High • Status: Enforced'
          }
        ]
      }
    ];

    await this.sendSlackMessage(orgId, title, blocks);
  },

  /**
   * Scoped Trigger: Drift Detected
   */
  async notifyDriftDetected(orgId: string, agentName: string, driftType: string, severity: string) {
    const config = await this.getConfig(orgId);
    if (!config || !config.enabled || !config.notifyOn.includes('drift_detected')) return;

    const title = '📉 Sentra AI Behavioral Drift Warning';
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '📉 Behavioral Drift Warning',
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Anomalous behavioral drift has been detected in agent metrics.\n\n*Agent:* \`${agentName}\`\n*Drift Category:* \`${driftType}\`\n*Severity Level:* \`${severity}\``
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: 'Recommendation: Audit the agent context and parameters in the Governance Console.'
          }
        ]
      }
    ];

    await this.sendSlackMessage(orgId, title, blocks);
  },

  /**
   * Scoped Trigger: Incident Logged
   */
  async notifyIncidentCreated(orgId: string, incidentTitle: string, severity: number) {
    const config = await this.getConfig(orgId);
    if (!config || !config.enabled || !config.notifyOn.includes('incident_created')) return;

    const title = '⚠️ Sentra AI Incident Logged';
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '⚠️ Compliance Incident Logged',
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `A new compliance/security incident has been cataloged.\n\n*Details:* ${incidentTitle}\n*Risk Severity Score:* \`${severity}/100\``
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: 'Action Required: Review in Incident & Remediation Center.'
          }
        ]
      }
    ];

    await this.sendSlackMessage(orgId, title, blocks);
  },

  /**
   * Scoped Trigger: Policy Violation
   */
  async notifyPolicyViolation(orgId: string, policyName: string, agentName: string) {
    const config = await this.getConfig(orgId);
    if (!config || !config.enabled || !config.notifyOn.includes('policy_violation')) return;

    const title = '❌ Sentra AI Policy Violation Alert';
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '❌ Policy Violation Alert',
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `A policy compliance violation was logged during evaluation.\n\n*Policy Name:* \`${policyName}\`\n*AI Agent Node:* \`${agentName}\``
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: 'Compliance Center • Automatic Alert'
          }
        ]
      }
    ];

    await this.sendSlackMessage(orgId, title, blocks);
  },

  /**
   * Scoped Trigger: Workflow Task Transition
   */
  async notifyWorkflowChange(orgId: string, taskTitle: string, state: string, assignee: string) {
    const config = await this.getConfig(orgId);
    if (!config || !config.enabled || !config.notifyOn.includes('workflow_change')) return;

    const title = '🔄 Sentra AI Workflow Change';
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🔄 Workflow Change Alert',
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `A governance workflow task has updated status.\n\n*Task:* \`${taskTitle}\`\n*State:* \`${state}\`\n*Assignee:* \`${assignee || 'Unassigned'}\``
        }
      }
    ];

    await this.sendSlackMessage(orgId, title, blocks);
  }
};

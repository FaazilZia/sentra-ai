import prisma from '../config/db';
import logger from '../utils/logger';
import { IncomingWebhook } from '@slack/webhook';
import { encryptCredentials, decryptCredentials } from '../utils/credentialHelper';

export const SlackService = {
  /**
   * Fetch Slack Configuration for an organization.
   * Decrypts the stored webhook URL before returning.
   */
  async getConfig(orgId: string) {
    try {
      const config = await prisma.slack_config.findUnique({
        where: { orgId }
      });
      if (!config) return null;

      let decryptedUrl = config.webhookUrl;
      try {
        decryptedUrl = decryptCredentials(config.webhookUrl);
      } catch {
        // Fallback if already plaintext
        decryptedUrl = config.webhookUrl;
      }

      return {
        ...config,
        webhookUrl: decryptedUrl
      };
    } catch (error) {
      logger.error(`[SlackService] Failed to get config for org ${orgId}:`, error);
      return null;
    }
  },

  /**
   * Save (Upsert) Slack Configuration for an organization.
   * Encrypts the webhook URL with AES-256-GCM before database persistence.
   */
  async saveConfig(orgId: string, data: { webhookUrl: string; channel: string; enabled?: boolean; notifyOn: string[] }) {
    try {
      const encryptedUrl = encryptCredentials(data.webhookUrl.trim());
      const saved = await prisma.slack_config.upsert({
        where: { orgId },
        update: {
          webhookUrl: encryptedUrl,
          channel: data.channel,
          enabled: data.enabled ?? true,
          notifyOn: data.notifyOn
        },
        create: {
          orgId,
          webhookUrl: encryptedUrl,
          channel: data.channel,
          enabled: data.enabled ?? true,
          notifyOn: data.notifyOn
        }
      });

      return {
        ...saved,
        webhookUrl: data.webhookUrl
      };
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
   * Core Slack message delivery with decrypted webhook
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
      let resolvedUrl = webhookUrl;
      try {
        resolvedUrl = decryptCredentials(webhookUrl);
      } catch {
        resolvedUrl = webhookUrl;
      }

      const webhook = new IncomingWebhook(resolvedUrl);
      await webhook.send({
        text: '🔔 *Sentraa AI Slack Integration Test* \nConnection successful! This channel is now active for compliance alerts.',
        channel,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '🔔 Sentraa AI Integration Test',
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
                text: 'Sentraa AI Security Ledger • Webhook Test'
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
   * Dispatches rich Slack Block Kit notifications for BLOCK and FLAG decision events.
   */
  async notifyDecisionEvent(orgId: string, event: {
    status: 'blocked' | 'flagged';
    agent: string;
    action: string;
    risk?: string;
    reason?: string;
    policyName?: string;
    ruleId?: string;
    compliance?: string[];
    mode?: string;
  }): Promise<boolean> {
    const config = await this.getConfig(orgId);
    if (!config?.enabled || !config?.webhookUrl) return false;

    const notifyOn = config.notifyOn || [];
    const isBlocked = event.status === 'blocked';
    const isFlagged = event.status === 'flagged';

    // Verify triggers if explicitly defined
    if (notifyOn.length > 0) {
      const allowsBlock = isBlocked && (notifyOn.includes('guardrail_block') || notifyOn.includes('policy_violation') || notifyOn.includes('block'));
      const allowsFlag = isFlagged && (notifyOn.includes('guardrail_block') || notifyOn.includes('drift_detected') || notifyOn.includes('flag'));
      if (!allowsBlock && !allowsFlag) {
        return false;
      }
    }

    const dashboardUrl = (process.env.FRONTEND_URL || 'https://sentraatech.info').split(',')[0].replace(/\/$/, '');
    const headerTitle = isBlocked ? '🚨 Sentraa AI: Action BLOCKED' : '⚠️ Sentraa AI: Action FLAGGED';
    const severityBadge = (event.risk || 'high').toUpperCase();
    const policyText = event.policyName || (event.compliance && event.compliance.length > 0 ? event.compliance.join(', ') : 'Security Guardrail Policy');

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: headerTitle,
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Status:* \`${event.status.toUpperCase()}\` | *Risk Level:* \`${severityBadge}\`\n*Agent:* \`${event.agent}\`\n*Action:* \`${event.action}\``
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Rule / Policy:*\n${policyText}`
          },
          {
            type: 'mrkdwn',
            text: `*Time:*\n${new Date().toLocaleTimeString()}`
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Reason:* ${event.reason || 'Security policy violation detected'}`
        }
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: isBlocked ? 'View Incident' : 'Review in Dashboard',
              emoji: true
            },
            url: `${dashboardUrl}/app/incidents`,
            style: isBlocked ? 'danger' : 'primary'
          }
        ]
      }
    ];

    return await this.sendSlackMessage(orgId, headerTitle, blocks);
  },

  /**
   * Scoped Trigger: Guardrail Action Blocked
   */
  async notifyGuardrailBlock(orgId: string, agentName: string, action: string, policyName: string) {
    return await this.notifyDecisionEvent(orgId, {
      status: 'blocked',
      agent: agentName,
      action,
      risk: 'high',
      reason: 'Guardrail interception',
      policyName
    });
  },

  /**
   * Scoped Trigger: Drift Detected
   */
  async notifyDriftDetected(orgId: string, agentName: string, driftType: string, severity: string) {
    const config = await this.getConfig(orgId);
    if (!config || !config.enabled || !config.notifyOn.includes('drift_detected')) return;

    const title = '📉 Sentraa AI Behavioral Drift Warning';
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

    const title = '⚠️ Sentraa AI Incident Logged';
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
    return await this.notifyDecisionEvent(orgId, {
      status: 'blocked',
      agent: agentName,
      action: 'Policy Violation Event',
      risk: 'high',
      reason: `Policy compliance violation during evaluation: ${policyName}`,
      policyName
    });
  },

  /**
   * Scoped Trigger: Workflow Task Transition
   */
  async notifyWorkflowChange(orgId: string, taskTitle: string, state: string, assignee: string) {
    const config = await this.getConfig(orgId);
    if (!config || !config.enabled || !config.notifyOn.includes('workflow_change')) return;

    const title = '🔄 Sentraa AI Workflow Change';
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

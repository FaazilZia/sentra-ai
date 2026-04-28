import nodemailer from 'nodemailer';
import axios from 'axios';
import prisma from '../config/db';

export interface AlertViolation {
  agent: string;
  action: string;
  risk: string;
  reason: string;
  policyTriggered?: string;
  timestamp: Date;
}

class AlertService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initEmail();
  }

  private initEmail() {
    if (process.env.SMTP_HOST) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      console.log(`[AlertService] SMTP initialized with host: ${process.env.SMTP_HOST}`);
    } else {
      console.warn('[AlertService] SMTP_HOST not provided. Email alerts will be disabled.');
    }
  }

  async sendEmailAlert(orgId: string, violation: AlertViolation) {
    try {
      const org = await prisma.organizations.findUnique({
        where: { id: orgId },
        select: { alertEmail: true, name: true }
      });

      if (!org?.alertEmail) {
        console.warn(`[AlertService] No alertEmail found for organization: ${orgId}`);
        return;
      }

      if (!this.transporter) {
        console.warn('[AlertService] SMTP transporter not initialized. Cannot send alert.');
        return;
      }

      const dashboardUrl = process.env.FRONTEND_URL || 'https://app.sentra.ai';
      
      const mailOptions = {
        from: process.env.SMTP_FROM || '"Sentra AI Alerts" <alerts@sentra.ai>',
        to: org.alertEmail,
        subject: `🚨 [BLOCK] AI Security Violation: ${violation.action}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
            <h2 style="color: #e11d48; margin-top: 0;">AI Action Blocked</h2>
            <p>A high-risk AI action was blocked for organization: <strong>${org.name}</strong></p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; width: 140px;">Agent</td>
                <td style="padding: 8px 0; font-weight: bold;">${violation.agent}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Action</td>
                <td style="padding: 8px 0; font-weight: bold;">${violation.action}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Risk Level</td>
                <td style="padding: 8px 0;"><span style="background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">${violation.risk.toUpperCase()}</span></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Policy</td>
                <td style="padding: 8px 0;">${violation.policyTriggered || 'General Safety Policy'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Reason</td>
                <td style="padding: 8px 0;">${violation.reason}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Timestamp</td>
                <td style="padding: 8px 0;">${violation.timestamp.toISOString()}</td>
              </tr>
            </table>
            
            <a href="${dashboardUrl}/app/incidents" style="display: inline-block; background: #0f172a; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 10px;">View in Dashboard</a>
            
            <p style="font-size: 12px; color: #94a3b8; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
              This is an automated security alert from Sentra AI Governance Platform.
            </p>
          </div>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`[AlertService] Email alert sent to ${org.alertEmail}. MessageId: ${info.messageId}`);
    } catch (error: any) {
      console.error('[AlertService] Failed to send email alert:', error.message || error);
    }
  }

  async sendSlackAlert(orgId: string, violation: AlertViolation) {
    try {
      const org = await prisma.organizations.findUnique({
        where: { id: orgId },
        select: { slackWebhookUrl: true, name: true }
      });

      if (!org?.slackWebhookUrl) return;

      const dashboardUrl = process.env.FRONTEND_URL || 'https://app.sentra.ai';

      const slackMessage = {
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "🚨 Sentra AI: Action Blocked",
              emoji: true
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Organization:* ${org.name}\n*Agent:* \`${violation.agent}\`\n*Action:* \`${violation.action}\`\n*Risk:* \`${violation.risk.toUpperCase()}\``
            }
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Policy:*\n${violation.policyTriggered || 'General Safety'}`
              },
              {
                type: "mrkdwn",
                text: `*Time:*\n${violation.timestamp.toLocaleTimeString()}`
              }
            ]
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Reason:* ${violation.reason}`
            }
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "View Incident",
                  emoji: true
                },
                url: `${dashboardUrl}/app/incidents`,
                style: "danger"
              }
            ]
          }
        ]
      };

      await axios.post(org.slackWebhookUrl, slackMessage);
    } catch (error) {
      console.error('[AlertService] Failed to send Slack alert:', error);
    }
  }

  /**
   * Orchestrates notifications for a block decision.
   * Fire-and-forget.
   */
  notify(orgId: string, decision: any, agent: string, action: string) {
    const violation: AlertViolation = {
      agent,
      action,
      risk: decision.risk || 'high',
      reason: decision.reason || 'Security policy violation',
      policyTriggered: Array.isArray(decision.compliance) ? decision.compliance[0] : decision.compliance,
      timestamp: new Date()
    };

    // Fire and forget
    this.sendEmailAlert(orgId, violation).catch(err => console.error(err));
    this.sendSlackAlert(orgId, violation).catch(err => console.error(err));
  }
}

export const alertService = new AlertService();

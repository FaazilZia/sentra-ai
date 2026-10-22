import nodemailer from 'nodemailer';
import logger from '../utils/logger';
import { sanitizeString, sanitizeObject } from '../utils/sentrySanitizer';

export type SystemAlertType =
  | 'service_down'
  | 'ready_failing'
  | 'error_rate_spike'
  | 'dlq_growing'
  | 'connector_scan_failing_repeatedly';

export type SystemAlertSeverity = 'critical' | 'warning' | 'info';

export interface SystemAlertPayload {
  type: SystemAlertType;
  severity: SystemAlertSeverity;
  title: string;
  message: string;
  details?: Record<string, any>;
  timestamp?: Date;
}

export interface AlertDeliveryResult {
  slack: boolean;
  email: boolean;
  errors: string[];
}

class SystemAlertService {
  private readonly lastAlertTimestamps: Map<string, number> = new Map();
  private readonly THROTTLE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes cooldown per alert type

  /**
   * Dispatches system alert across Slack and Email channels with secret/PII scrubbing.
   */
  async sendAlert(payload: SystemAlertPayload, force: boolean = false): Promise<AlertDeliveryResult> {
    const timestamp = payload.timestamp || new Date();
    const alertKey = `${payload.type}:${payload.severity}`;

    if (!force) {
      const lastSent = this.lastAlertTimestamps.get(alertKey) || 0;
      if (Date.now() - lastSent < this.THROTTLE_WINDOW_MS) {
        logger.warn(`[SystemAlert] Suppressing throttled alert '${alertKey}' (cooldown active).`);
        return { slack: false, email: false, errors: ['Throttled'] };
      }
    }

    this.lastAlertTimestamps.set(alertKey, Date.now());

    // Sanitize all contents before dispatch
    const safeTitle = sanitizeString(payload.title);
    const safeMessage = sanitizeString(payload.message);
    const safeDetails = payload.details ? sanitizeObject(payload.details) : {};

    const result: AlertDeliveryResult = { slack: false, email: false, errors: [] };

    // 1. Dispatch to Slack Webhook
    try {
      result.slack = await this.dispatchSlack({
        ...payload,
        title: safeTitle,
        message: safeMessage,
        details: safeDetails,
        timestamp,
      });
    } catch (err: any) {
      result.errors.push(`Slack dispatch failed: ${err.message || err}`);
      logger.error('[SystemAlert] Slack dispatch error:', err);
    }

    // 2. Dispatch to Email
    try {
      result.email = await this.dispatchEmail({
        ...payload,
        title: safeTitle,
        message: safeMessage,
        details: safeDetails,
        timestamp,
      });
    } catch (err: any) {
      result.errors.push(`Email dispatch failed: ${err.message || err}`);
      logger.error('[SystemAlert] Email dispatch error:', err);
    }

    logger.info({
      type: payload.type,
      severity: payload.severity,
      slackSent: result.slack,
      emailSent: result.email,
    }, `[SystemAlert] Alert dispatched: ${safeTitle}`);

    return result;
  }

  /**
   * Internal Slack delivery helper
   */
  private async dispatchSlack(payload: SystemAlertPayload & { timestamp: Date }): Promise<boolean> {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      logger.warn('[SystemAlert] SLACK_WEBHOOK_URL not configured. Skipping Slack delivery.');
      return false;
    }

    let emoji = 'ℹ️';
    if (payload.severity === 'critical') {
      emoji = '🔥';
    } else if (payload.severity === 'warning') {
      emoji = '⚠️';
    }
    const detailFields = Object.entries(payload.details || {}).map(([k, v]) => ({
      type: 'mrkdwn',
      text: `*${k}:*\n\`${typeof v === 'object' ? JSON.stringify(v) : v}\``,
    }));

    const body = {
      text: `${emoji} *[${payload.severity.toUpperCase()}] ${payload.title}*`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${emoji} Sentra Alert: ${payload.title}`,
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Type:* \`${payload.type}\` | *Severity:* *${payload.severity.toUpperCase()}*\n*Timestamp:* ${payload.timestamp.toISOString()}\n\n${payload.message}`,
          },
        },
        ...(detailFields.length > 0 ? [{
          type: 'section',
          fields: detailFields.slice(0, 10), // Slack limit
        }] : []),
      ],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Slack API responded with status ${response.status}: ${errText}`);
    }

    return true;
  }

  /**
   * Internal Email delivery helper
   */
  private async dispatchEmail(payload: SystemAlertPayload & { timestamp: Date }): Promise<boolean> {
    const smtpHost = process.env.SMTP_HOST;
    if (!smtpHost) {
      logger.warn('[SystemAlert] SMTP_HOST not configured. Skipping Email delivery.');
      return false;
    }

    const recipient = process.env.ALERT_EMAIL || process.env.ADMIN_EMAIL || process.env.SMTP_TO || 'alerts@sentraatech.com';
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number.parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    let severityColor = '#3b82f6';
    if (payload.severity === 'critical') {
      severityColor = '#e11d48';
    } else if (payload.severity === 'warning') {
      severityColor = '#f59e0b';
    }
    const detailRows = Object.entries(payload.details || {}).map(([k, v]) => `
      <tr>
        <td style="padding: 6px 12px; font-weight: bold; color: #475569; border-bottom: 1px solid #e2e8f0;">${k}</td>
        <td style="padding: 6px 12px; color: #0f172a; font-family: monospace; border-bottom: 1px solid #e2e8f0;">${typeof v === 'object' ? JSON.stringify(v) : v}</td>
      </tr>
    `).join('');

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: ${severityColor}; color: white; padding: 16px 24px;">
          <h2 style="margin: 0; font-size: 20px;">[${payload.severity.toUpperCase()}] ${payload.title}</h2>
        </div>
        <div style="padding: 24px;">
          <p style="font-size: 15px; color: #1e293b; line-height: 1.5; margin-top: 0;">${payload.message}</p>
          <div style="background-color: #f8fafc; border-radius: 6px; padding: 12px; margin: 16px 0;">
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b;"><strong>Alert Type:</strong> <code>${payload.type}</code></p>
            <p style="margin: 0; font-size: 13px; color: #64748b;"><strong>Timestamp:</strong> ${payload.timestamp.toISOString()}</p>
          </div>
          ${detailRows ? `
            <h4 style="margin: 16px 0 8px 0; color: #334155;">Diagnostic Details</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              ${detailRows}
            </table>
          ` : ''}
          <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 12px;">
            Sentra AI Automated Ops &amp; Reliability Alerting System
          </p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Sentra Ops" <alerts@sentraatech.com>',
      to: recipient,
      subject: `🚨 [${payload.severity.toUpperCase()}] Sentra Alert: ${payload.title}`,
      html,
    });

    return true;
  }

  // ─── 5 Required Trigger Handlers ─────────────────────────────────────────

  /**
   * 1. Alert: Service Down
   */
  async triggerServiceDownAlert(reason: string, details?: Record<string, any>): Promise<AlertDeliveryResult> {
    return this.sendAlert({
      type: 'service_down',
      severity: 'critical',
      title: 'Service Down / Process Termination',
      message: `The Sentra backend service has reported an unrecoverable failure: ${reason}`,
      details: {
        reason,
        uptimeSeconds: process.uptime(),
        nodeVersion: process.version,
        ...details,
      },
    });
  }

  /**
   * 2. Alert: /ready Failing
   */
  async triggerReadyFailingAlert(checks: { db: string; redis: string; queue: string }, error?: string): Promise<AlertDeliveryResult> {
    return this.sendAlert({
      type: 'ready_failing',
      severity: 'critical',
      title: 'Readiness Probe /ready Failing',
      message: 'The /ready health check failed. One or more critical dependencies are unreachable.',
      details: {
        database: checks.db,
        redis: checks.redis,
        queue: checks.queue,
        error: error || 'Dependency check failed',
      },
    });
  }

  /**
   * 3. Alert: Error Rate Spike
   */
  async triggerErrorRateSpikeAlert(currentRate: number, threshold: number = 0.05): Promise<AlertDeliveryResult> {
    const percentage = (currentRate * 100).toFixed(2);
    const thresholdPercentage = (threshold * 100).toFixed(2);
    return this.sendAlert({
      type: 'error_rate_spike',
      severity: 'warning',
      title: 'HTTP Error Rate Spike Detected',
      message: `HTTP 5xx error rate has spiked to ${percentage}%, exceeding the alert threshold of ${thresholdPercentage}%.`,
      details: {
        currentErrorRate: `${percentage}%`,
        threshold: `${thresholdPercentage}%`,
      },
    });
  }

  /**
   * 4. Alert: DLQ Growing
   */
  async triggerDLQGrowingAlert(queueName: string, count: number, threshold: number = 1): Promise<AlertDeliveryResult> {
    return this.sendAlert({
      type: 'dlq_growing',
      severity: 'warning',
      title: `Dead Letter Queue (DLQ) Growing in Queue '${queueName}'`,
      message: `BullMQ failed jobs count for '${queueName}' has reached ${count} (threshold: ${threshold}). Jobs require inspection or retry.`,
      details: {
        queue: queueName,
        failedJobCount: count,
        threshold,
      },
    });
  }

  /**
   * 5. Alert: Connector Scan Failing Repeatedly
   */
  async triggerConnectorScanFailingAlert(
    connectorId: string,
    connectorName: string,
    consecutiveFailures: number,
    lastError: string
  ): Promise<AlertDeliveryResult> {
    return this.sendAlert({
      type: 'connector_scan_failing_repeatedly',
      severity: 'critical',
      title: `Connector Scan Failing Repeatedly: ${connectorName}`,
      message: `Inbound connector '${connectorName}' (ID: ${connectorId}) has failed ${consecutiveFailures} consecutive scan attempts.`,
      details: {
        connectorId,
        connectorName,
        consecutiveFailures,
        lastError,
      },
    });
  }

  /**
   * Send Test Alert Command
   */
  async sendTestAlert(type: SystemAlertType = 'ready_failing'): Promise<AlertDeliveryResult> {
    logger.info(`[SystemAlert] Dispatching test alert of type '${type}' (force=true)...`);
    return this.sendAlert({
      type,
      severity: 'warning',
      title: `TEST ALERT: Verification of ${type}`,
      message: `This is an automated operational test alert verifying delivery across Slack and Email channels for alert type '${type}'.`,
      details: {
        testMode: true,
        alertType: type,
        nodeEnv: process.env.NODE_ENV || 'development',
        sentAt: new Date().toISOString(),
      },
    }, true);
  }
}

export const systemAlertService = new SystemAlertService();

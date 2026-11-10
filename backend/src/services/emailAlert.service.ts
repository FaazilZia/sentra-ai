import nodemailer from 'nodemailer';
import prisma from '../config/db';
import logger from '../utils/logger';
import { anonymizeText } from '../utils/masking';
import { PIIScannerService } from './piiScanner.service';
import { DecisionAlertEvent } from './alertPipeline.service';
import { getRedisClient } from '../config/redis';

export type AlertSeverityFilter = 'high' | 'medium_and_high' | 'all';

export interface EmailAlertConfig {
  recipients: string[];
  enabled: boolean;
  severityFilter: AlertSeverityFilter;
  hourlyRateLimit: number;
  orgName?: string;
}

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length < 3 || trimmed.length > 254) return false;
  return EMAIL_REGEX.test(trimmed);
}

export function validateRecipients(recipients: unknown): { valid: boolean; error?: string; recipients: string[] } {
  if (!Array.isArray(recipients)) {
    return { valid: false, error: 'Recipients must be an array of email addresses', recipients: [] };
  }

  if (recipients.length > 10) {
    return { valid: false, error: 'A maximum of 10 alert recipients is allowed per organization', recipients: [] };
  }

  const cleaned: string[] = [];
  const seen = new Set<string>();

  for (const item of recipients) {
    if (typeof item !== 'string' || !isValidEmail(item)) {
      return { valid: false, error: `Invalid email address format: ${String(item).slice(0, 50)}`, recipients: [] };
    }
    const normalized = item.trim().toLowerCase();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      cleaned.push(normalized);
    }
  }

  return { valid: true, recipients: cleaned };
}

export function normalizeSeverityFilter(val: unknown): AlertSeverityFilter {
  if (typeof val === 'string') {
    const lower = val.trim().toLowerCase();
    if (lower === 'all' || lower === 'low') return 'all';
    if (lower === 'medium_and_high' || lower === 'medium') return 'medium_and_high';
    if (lower === 'high') return 'high';
  }
  return 'high';
}

/**
 * Resolves the application base URL for dashboard deep-links.
 * Prefers APP_BASE_URL, APP_URL, or FRONTEND_URL from environment variables,
 * defaulting to the canonical production origin (https://sentraatech.info).
 * Strips trailing slashes and handles comma-separated lists.
 */
export function resolveDashboardBaseUrl(): string {
  const configured = process.env.APP_BASE_URL || process.env.APP_URL || process.env.FRONTEND_URL;
  if (!configured || configured.trim() === '') {
    return 'https://sentraatech.info';
  }
  const primary = configured.split(',')[0].trim();
  return primary.replace(/\/+$/, '');
}

export class EmailAlertService {
  private db: any = prisma;
  private inMemoryRateLimits = new Map<string, { count: number; resetAt: number }>();
  private inMemoryTestRateLimits = new Map<string, { count: number; resetAt: number }>();

  setDb(customPrisma: any): void {
    this.db = customPrisma;
  }

  /**
   * Retrieves the email alert configuration for a specific organization.
   * Multi-tenant isolation: Scoped strictly to the provided orgId.
   * Backwards compatible: Handles JSON structures as well as legacy single-email strings.
   */
  async getConfig(orgId: string): Promise<EmailAlertConfig> {
    const defaultLimit = Number.parseInt(process.env.ALERT_EMAIL_RATE_LIMIT_PER_HOUR || '10', 10);
    const defaultFilter: AlertSeverityFilter = 'high';

    try {
      const org = await (this.db || prisma).organizations.findUnique({
        where: { id: orgId },
        select: { alertEmail: true, name: true }
      });

      if (!org || !org.alertEmail) {
        return {
          recipients: [],
          enabled: false,
          severityFilter: defaultFilter,
          hourlyRateLimit: defaultLimit,
          orgName: org?.name || 'Your Organization',
        };
      }

      const raw = org.alertEmail.trim();

      // Check if alertEmail is stored as serialized JSON
      if (raw.startsWith('{') && raw.endsWith('}')) {
        try {
          const parsed = JSON.parse(raw);
          const validation = validateRecipients(parsed.recipients || []);
          return {
            recipients: validation.valid ? validation.recipients : [],
            enabled: Boolean(parsed.enabled),
            severityFilter: normalizeSeverityFilter(parsed.severityFilter),
            hourlyRateLimit: Number(parsed.hourlyRateLimit) || defaultLimit,
            orgName: org.name || 'Your Organization',
          };
        } catch {
          // If JSON parsing fails, fall through to legacy handler
        }
      }

      // Legacy plain email address support
      if (isValidEmail(raw)) {
        return {
          recipients: [raw.toLowerCase()],
          enabled: true,
          severityFilter: defaultFilter,
          hourlyRateLimit: defaultLimit,
          orgName: org.name || 'Your Organization',
        };
      }

      return {
        recipients: [],
        enabled: false,
        severityFilter: defaultFilter,
        hourlyRateLimit: defaultLimit,
        orgName: org.name || 'Your Organization',
      };
    } catch (err: any) {
      logger.error(`[AlertEmail] Failed to fetch email alert config for org ${orgId}:`, err);
      return {
        recipients: [],
        enabled: false,
        severityFilter: defaultFilter,
        hourlyRateLimit: defaultLimit,
        orgName: 'Your Organization',
      };
    }
  }

  /**
   * Saves or updates the email alert configuration for an organization.
   * Validates recipients (max 10, RFC compliant) and settings.
   */
  async saveConfig(
    orgId: string,
    input: { recipients: string[]; enabled?: boolean; severityFilter?: string; hourlyRateLimit?: number }
  ): Promise<EmailAlertConfig> {
    const validation = validateRecipients(input.recipients);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid email recipients');
    }

    const defaultLimit = Number.parseInt(process.env.ALERT_EMAIL_RATE_LIMIT_PER_HOUR || '10', 10);
    const hourlyRateLimit = Math.min(Math.max(Number(input.hourlyRateLimit) || defaultLimit, 1), 100);
    const severityFilter = normalizeSeverityFilter(input.severityFilter);
    const enabled = input.enabled ?? (validation.recipients.length > 0);

    const config: EmailAlertConfig = {
      recipients: validation.recipients,
      enabled,
      severityFilter,
      hourlyRateLimit
    };

    await (this.db || prisma).organizations.update({
      where: { id: orgId },
      data: {
        alertEmail: JSON.stringify(config),
        updated_at: new Date()
      }
    });

    const maskedRecipients = config.recipients.map(r => anonymizeText(r));
    logger.info(
      `[AlertEmail] Saved email alert settings for org ${orgId}: ${config.recipients.length} recipients (${maskedRecipients.join(', ')}), enabled=${config.enabled}, severity=${config.severityFilter}, hourlyCap=${config.hourlyRateLimit}`
    );

    return config;
  }

  /**
   * Enforces per-organization hourly rate limiting.
   * Guaranteed not to log secrets or full recipient email addresses.
   */
  async checkAndIncrementRateLimit(orgId: string, limit: number): Promise<boolean> {
    const effectiveLimit = limit > 0 ? limit : 10;
    const now = Date.now();
    const windowMs = 60 * 60 * 1000; // 1 hour

    // 1. Redis rate limit if connected
    const redis = getRedisClient();
    if (redis && redis.status === 'ready') {
      try {
        const hourBucket = Math.floor(now / windowMs);
        const redisKey = `ratelimit:email_alert:${orgId}:${hourBucket}`;
        const count = await redis.incr(redisKey);
        if (count === 1) {
          await redis.expire(redisKey, 3600);
        }
        if (count > effectiveLimit) {
          logger.warn(
            `[AlertEmail] Rate limit exceeded for org ${orgId}: limit of ${effectiveLimit}/hour reached (${count}/${effectiveLimit}). Email alert suppressed.`
          );
          return false;
        }
        return true;
      } catch (redisErr) {
        logger.warn(`[AlertEmail] Redis rate check failed, falling back to memory:`, redisErr);
      }
    }

    // 2. In-memory sliding window fallback
    const entry = this.inMemoryRateLimits.get(orgId);
    if (!entry || now > entry.resetAt) {
      this.inMemoryRateLimits.set(orgId, { count: 1, resetAt: now + windowMs });
      return true;
    }

    entry.count += 1;
    if (entry.count > effectiveLimit) {
      logger.warn(
        `[AlertEmail] Rate limit exceeded for org ${orgId}: limit of ${effectiveLimit}/hour reached (${entry.count}/${effectiveLimit}). Email alert suppressed.`
      );
      return false;
    }

    return true;
  }

  /**
   * Dedicated rate limiter for test emails (e.g. 5 per 10 minutes per org).
   */
  async checkTestRateLimit(orgId: string, limit: number = 5): Promise<boolean> {
    const now = Date.now();
    const windowMs = 10 * 60 * 1000; // 10 minutes

    const entry = this.inMemoryTestRateLimits.get(orgId);
    if (!entry || now > entry.resetAt) {
      this.inMemoryTestRateLimits.set(orgId, { count: 1, resetAt: now + windowMs });
      return true;
    }

    entry.count += 1;
    if (entry.count > limit) {
      logger.warn(`[AlertEmail] Test email rate limit exceeded for org ${orgId}: max ${limit} tests per 10 minutes.`);
      return false;
    }

    return true;
  }

  /**
   * Resets rate limit trackers (used primarily in test suites).
   */
  resetRateLimits(): void {
    this.inMemoryRateLimits.clear();
    this.inMemoryTestRateLimits.clear();
  }

  /**
   * Creates a nodemailer transporter from environment variables.
   * Credentials come strictly from environment variables.
   */
  getTransporter(): nodemailer.Transporter | null {
    const smtpHost = process.env.SMTP_HOST;
    if (!smtpHost) {
      return null;
    }

    const smtpPort = Number.parseInt(process.env.SMTP_PORT || '587', 10);
    const isSecure = process.env.SMTP_PORT === '465';

    const auth = (process.env.SMTP_USER && process.env.SMTP_PASS)
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined;

    return nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: isSecure,
      auth
    });
  }

  /**
   * Checks whether an alert event matches the organization's severity filter.
   */
  shouldDispatchForSeverity(filter: AlertSeverityFilter, risk: string): boolean {
    const normalizedRisk = (risk || 'low').toLowerCase();

    if (filter === 'all') {
      return true;
    }
    if (filter === 'medium_and_high') {
      return normalizedRisk === 'high' || normalizedRisk === 'medium';
    }
    // Default: 'high'
    return normalizedRisk === 'high';
  }

  /**
   * Sends an email alert for a decision violation event.
   * Multi-tenant isolated: Strictly alerts the target organization's configured recipients.
   */
  async sendAlert(orgId: string, event: DecisionAlertEvent): Promise<boolean> {
    try {
      const config = await this.getConfig(orgId);

      // 1. Channel enabled and recipients configured check
      if (!config.enabled || config.recipients.length === 0) {
        return false;
      }

      // 2. Severity filter check
      if (!this.shouldDispatchForSeverity(config.severityFilter, event.risk)) {
        return false;
      }

      // 3. Hourly per-org rate limit check
      const allowed = await this.checkAndIncrementRateLimit(orgId, config.hourlyRateLimit);
      if (!allowed) {
        return false;
      }

      // 4. Transporter check
      const transporter = this.getTransporter();
      if (!transporter) {
        logger.warn('[AlertEmail] SMTP_HOST not configured. Cannot send email alert.');
        return false;
      }

      const orgName = config.orgName || 'Your Organization';

      // Redact PII in action
      const sanitizedAction = PIIScannerService.redact(event.action || '');
      const dashboardBaseUrl = resolveDashboardBaseUrl();
      const incidentUrl = event.incidentId
        ? `${dashboardBaseUrl}/app/incidents?id=${encodeURIComponent(event.incidentId)}`
        : `${dashboardBaseUrl}/app/incidents`;

      const isBlocked = event.status === 'blocked';
      const severityColor = isBlocked ? '#e11d48' : '#d97706';
      const statusTitle = isBlocked ? 'AI Action Blocked' : 'AI Action Flagged';

      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: ${severityColor}; color: white; padding: 18px 24px;">
            <h2 style="margin: 0; font-size: 18px; font-weight: 700;">🚨 [${event.status.toUpperCase()}] ${statusTitle} — Sentraa AI</h2>
          </div>
          <div style="padding: 24px; background-color: #ffffff;">
            <p style="margin-top: 0; font-size: 14px; color: #334155;">
              A security policy violation occurred in organization <strong>${orgName}</strong>.
            </p>
            <table style="width: 100%; border-collapse: collapse; margin: 18px 0; font-size: 13px;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; width: 140px; font-weight: 600;">Agent</td>
                <td style="padding: 8px 0; font-weight: bold; color: #0f172a;">${event.agent}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Action</td>
                <td style="padding: 8px 0; font-family: monospace; color: #0f172a;">${sanitizedAction}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Risk Level</td>
                <td style="padding: 8px 0;">
                  <span style="background: ${isBlocked ? '#fee2e2' : '#fef3c7'}; color: ${isBlocked ? '#991b1b' : '#92400e'}; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">
                    ${(event.risk || 'HIGH').toUpperCase()}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Policy</td>
                <td style="padding: 8px 0; color: #0f172a;">${event.matchedPolicy || event.policyName || 'General Safety Policy'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Reason</td>
                <td style="padding: 8px 0; color: #0f172a;">${event.reason}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Timestamp</td>
                <td style="padding: 8px 0; color: #0f172a;">${new Date(event.timestamp || Date.now()).toISOString()}</td>
              </tr>
            </table>

            <a href="${incidentUrl}" style="display: inline-block; background: #0f172a; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: bold; margin-top: 10px;">
              View Incident in Dashboard
            </a>

            <p style="font-size: 11px; color: #94a3b8; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
              Sentraa AI Automated Governance Platform | Tenant ID: ${orgId}
            </p>
          </div>
        </div>
      `;

      const fromAddress = process.env.SMTP_FROM || '"Sentraa AI Alerts" <alerts@sentraatech.com>';

      await transporter.sendMail({
        from: fromAddress,
        to: config.recipients,
        subject: `🚨 [${event.status.toUpperCase()}] Sentraa AI Security Violation: ${sanitizedAction.slice(0, 80)}`,
        html
      });

      const maskedRecipients = config.recipients.map(r => anonymizeText(r));
      logger.info(
        `[AlertEmail] Successfully sent email alert for org ${orgId} to ${config.recipients.length} recipients (${maskedRecipients.join(', ')}). Status: ${event.status}`
      );

      return true;
    } catch (err: any) {
      logger.error(`[AlertEmail] Failed to dispatch alert email for org ${orgId}:`, err);
      return false;
    }
  }

  /**
   * Dispatches a test alert email to verify channel configuration.
   * Multi-tenant isolated and rate-limited.
   */
  async sendTestEmail(orgId: string, overrideRecipient?: string): Promise<{ success: boolean; message: string; recipients: string[] }> {
    const rateOk = await this.checkTestRateLimit(orgId);
    if (!rateOk) {
      throw new Error('Rate limit exceeded: Too many test alert requests. Please wait a few minutes before trying again.');
    }

    const config = await this.getConfig(orgId);
    let targetRecipients: string[] = [];

    if (overrideRecipient) {
      if (!isValidEmail(overrideRecipient)) {
        throw new Error(`Invalid recipient email address: ${overrideRecipient}`);
      }
      targetRecipients = [overrideRecipient.trim().toLowerCase()];
    } else {
      if (!config.recipients || config.recipients.length === 0) {
        throw new Error('No email alert recipients configured for this organization. Please add at least one recipient first.');
      }
      targetRecipients = config.recipients;
    }

    const transporter = this.getTransporter();
    if (!transporter) {
      throw new Error('SMTP transporter is not configured on the server. Please verify SMTP environment variables.');
    }

    const orgName = config.orgName || 'Your Organization';

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #0f172a; color: white; padding: 18px 24px;">
          <h2 style="margin: 0; font-size: 18px; font-weight: 700;">🧪 Sentraa AI: Test Email Alert</h2>
        </div>
        <div style="padding: 24px; background-color: #ffffff;">
          <p style="margin-top: 0; font-size: 14px; color: #334155;">
            This is a test notification confirming that the per-organization email alert channel for <strong>${orgName}</strong> is properly configured.
          </p>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; margin: 16px 0; font-size: 13px;">
            <p style="margin: 0 0 6px 0; color: #475569;"><strong>Status:</strong> Active &amp; Verified</p>
            <p style="margin: 0 0 6px 0; color: #475569;"><strong>Organization ID:</strong> <code>${orgId}</code></p>
            <p style="margin: 0; color: #475569;"><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          </div>
          <p style="font-size: 13px; color: #64748b;">
            When policy violations or blocked actions occur, automated notifications will be delivered to this distribution list.
          </p>
          <p style="font-size: 11px; color: #94a3b8; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
            Sentraa AI Automated Governance Platform | Test Notification
          </p>
        </div>
      </div>
    `;

    const fromAddress = process.env.SMTP_FROM || '"Sentraa AI Alerts" <alerts@sentraatech.com>';

    await transporter.sendMail({
      from: fromAddress,
      to: targetRecipients,
      subject: `🧪 Sentraa AI: Test Alert for ${orgName}`,
      html
    });

    const masked = targetRecipients.map(r => anonymizeText(r));
    logger.info(`[AlertEmail] Test email successfully sent to ${masked.join(', ')} for org ${orgId}`);

    return {
      success: true,
      message: `Test alert email sent to ${targetRecipients.length} recipient(s)`,
      recipients: masked
    };
  }
}

export const emailAlertService = new EmailAlertService();

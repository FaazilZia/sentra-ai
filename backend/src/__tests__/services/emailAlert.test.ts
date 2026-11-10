jest.mock('../../config/db', () => ({
  __esModule: true,
  default: {
    organizations: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    slack_config: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    jira_config: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
  },
}));

jest.mock('nodemailer');
jest.mock('@slack/webhook', () => ({
  IncomingWebhook: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({ text: 'ok' }),
  })),
}));

import nodemailer from 'nodemailer';
import prisma from '../../config/db';
import logger from '../../utils/logger';
import { emailAlertService, isValidEmail, validateRecipients, normalizeSeverityFilter } from '../../services/emailAlert.service';
import { processAlertJob, DecisionAlertEvent } from '../../services/alertPipeline.service';

describe('Day 11: Per-Organization Email Alert Channel', () => {
  const orgA = 'org-tenant-alpha-111';
  const orgB = 'org-tenant-beta-222';

  const mockSendMail = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    emailAlertService.resetRateLimits();
    emailAlertService.setDb(prisma);

    process.env.SMTP_HOST = 'smtp.testprovider.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'test-smtp-user';
    process.env.SMTP_PASS = 'super-secret-smtp-password-12345';
    process.env.SMTP_FROM = '"Sentra Security" <alerts@sentraatech.com>';
    process.env.ALERT_EMAIL_RATE_LIMIT_PER_HOUR = '10';

    mockSendMail.mockResolvedValue({ messageId: 'msg-alert-12345' });
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: mockSendMail,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Validation & Helpers', () => {
    it('validates email addresses accurately', () => {
      expect(isValidEmail('sec@sentra.ai')).toBe(true);
      expect(isValidEmail('dev.ops+alerts@company.co.uk')).toBe(true);
      expect(isValidEmail('invalid-email-address')).toBe(false);
      expect(isValidEmail('missing-domain@')).toBe(false);
      expect(isValidEmail('@missing-user.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });

    it('enforces maximum 10 recipients and deduplicates addresses', () => {
      const validList = ['a@corp.com', 'b@corp.com', 'A@corp.com'];
      const res = validateRecipients(validList);
      expect(res.valid).toBe(true);
      expect(res.recipients).toEqual(['a@corp.com', 'b@corp.com']);

      const elevenEmails = Array.from({ length: 11 }, (_, i) => `user${i}@corp.com`);
      const overLimitRes = validateRecipients(elevenEmails);
      expect(overLimitRes.valid).toBe(false);
      expect(overLimitRes.error).toContain('maximum of 10 alert recipients');

      const invalidEmailRes = validateRecipients(['valid@corp.com', 'not-an-email']);
      expect(invalidEmailRes.valid).toBe(false);
      expect(invalidEmailRes.error).toContain('Invalid email address format');
    });

    it('normalizes severity filters correctly', () => {
      expect(normalizeSeverityFilter('high')).toBe('high');
      expect(normalizeSeverityFilter('HIGH')).toBe('high');
      expect(normalizeSeverityFilter('medium_and_high')).toBe('medium_and_high');
      expect(normalizeSeverityFilter('medium')).toBe('medium_and_high');
      expect(normalizeSeverityFilter('all')).toBe('all');
      expect(normalizeSeverityFilter('low')).toBe('all');
      expect(normalizeSeverityFilter('unknown_value')).toBe('high');
    });
  });

  describe('Configuration Persistence & Multi-Tenant Retrieval', () => {
    it('parses valid JSON config from organizations.alertEmail', async () => {
      const storedConfig = {
        recipients: ['security@alpha.com', 'ops@alpha.com'],
        enabled: true,
        severityFilter: 'medium_and_high',
        hourlyRateLimit: 15,
      };

      (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
        id: orgA,
        name: 'Alpha Corp',
        alertEmail: JSON.stringify(storedConfig),
      });

      const config = await emailAlertService.getConfig(orgA);
      expect(config.recipients).toEqual(['security@alpha.com', 'ops@alpha.com']);
      expect(config.enabled).toBe(true);
      expect(config.severityFilter).toBe('medium_and_high');
      expect(config.hourlyRateLimit).toBe(15);
    });

    it('handles legacy single-email strings gracefully with default settings', async () => {
      (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
        id: orgA,
        name: 'Alpha Corp',
        alertEmail: 'admin@legacy-company.com',
      });

      const config = await emailAlertService.getConfig(orgA);
      expect(config.recipients).toEqual(['admin@legacy-company.com']);
      expect(config.enabled).toBe(true);
      expect(config.severityFilter).toBe('high');
      expect(config.hourlyRateLimit).toBe(10);
    });

    it('returns empty disabled defaults when no alertEmail is configured', async () => {
      (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
        id: orgA,
        name: 'Alpha Corp',
        alertEmail: null,
      });

      const config = await emailAlertService.getConfig(orgA);
      expect(config.recipients).toEqual([]);
      expect(config.enabled).toBe(false);
      expect(config.severityFilter).toBe('high');
    });

    it('saves configuration with validated JSON into organizations.alertEmail', async () => {
      (prisma.organizations.update as jest.Mock).mockResolvedValue({
        id: orgA,
      });

      const saved = await emailAlertService.saveConfig(orgA, {
        recipients: ['sec@alpha.com', 'soc@alpha.com'],
        enabled: true,
        severityFilter: 'high',
        hourlyRateLimit: 20,
      });

      expect(saved.recipients).toEqual(['sec@alpha.com', 'soc@alpha.com']);
      expect(saved.enabled).toBe(true);
      expect(saved.severityFilter).toBe('high');
      expect(saved.hourlyRateLimit).toBe(20);

      expect(prisma.organizations.update).toHaveBeenCalledWith({
        where: { id: orgA },
        data: expect.objectContaining({
          alertEmail: expect.stringContaining('"recipients":["sec@alpha.com","soc@alpha.com"]'),
        }),
      });
    });
  });

  describe('AlertPipeline Event Routing & Multi-Tenant Isolation', () => {
    it('routes blocked high-risk decision alerts to configured recipients in alertPipeline', async () => {
      (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
        id: orgA,
        name: 'Alpha Corp',
        alertEmail: JSON.stringify({
          recipients: ['security@alpha.com', 'alerts@alpha.com'],
          enabled: true,
          severityFilter: 'high',
          hourlyRateLimit: 10,
        }),
      });

      const alertEvent: DecisionAlertEvent = {
        organizationId: orgA,
        agent: 'sql-agent',
        action: 'DROP TABLE customers;',
        status: 'blocked',
        risk: 'high',
        reason: 'Unauthorized database alteration detected',
        matchedPolicy: 'Data Protection Guardrail',
        compliance: ['SOC2', 'ISO27001'],
      };

      await processAlertJob(alertEvent);

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const mailCall = mockSendMail.mock.calls[0][0];
      expect(mailCall.to).toEqual(['security@alpha.com', 'alerts@alpha.com']);
      expect(mailCall.subject).toContain('[BLOCKED]');
      expect(mailCall.subject).toContain('DROP TABLE customers;');
      expect(mailCall.html).toContain('sql-agent');
      expect(mailCall.html).toContain('Data Protection Guardrail');
      expect(mailCall.html).toContain('Alpha Corp');
    });

    it('enforces multi-tenant isolation: Org A alerts never reach Org B recipients', async () => {
      (prisma.organizations.findUnique as jest.Mock).mockImplementation((args: any) => {
        const id = args?.where?.id;
        if (id === orgA) {
          return Promise.resolve({
            id: orgA,
            name: 'Alpha Corp',
            alertEmail: JSON.stringify({
              recipients: ['alpha-security@alpha.com'],
              enabled: true,
              severityFilter: 'high',
              hourlyRateLimit: 10,
            }),
          });
        }
        if (id === orgB) {
          return Promise.resolve({
            id: orgB,
            name: 'Beta Corp',
            alertEmail: JSON.stringify({
              recipients: ['beta-team@beta.com'],
              enabled: true,
              severityFilter: 'high',
              hourlyRateLimit: 10,
            }),
          });
        }
        return Promise.resolve(null);
      });

      // Dispatch event for Org A
      await processAlertJob({
        organizationId: orgA,
        agent: 'agent-alpha',
        action: 'sensitive_export',
        status: 'blocked',
        risk: 'high',
        reason: 'Policy block',
      });

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockSendMail.mock.calls[0][0].to).toEqual(['alpha-security@alpha.com']);
      expect(mockSendMail.mock.calls[0][0].to).not.toContain('beta-team@beta.com');

      mockSendMail.mockClear();

      // Dispatch event for Org B
      await processAlertJob({
        organizationId: orgB,
        agent: 'agent-beta',
        action: 'delete_backup',
        status: 'blocked',
        risk: 'high',
        reason: 'Destructive action',
      });

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockSendMail.mock.calls[0][0].to).toEqual(['beta-team@beta.com']);
      expect(mockSendMail.mock.calls[0][0].to).not.toContain('alpha-security@alpha.com');
    });

    it('does not send alerts when email channel is disabled', async () => {
      (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
        id: orgA,
        name: 'Alpha Corp',
        alertEmail: JSON.stringify({
          recipients: ['disabled-alerts@alpha.com'],
          enabled: false,
          severityFilter: 'high',
          hourlyRateLimit: 10,
        }),
      });

      await processAlertJob({
        organizationId: orgA,
        agent: 'bot',
        action: 'leak_credentials',
        status: 'blocked',
        risk: 'high',
        reason: 'Credential leak prevented',
      });

      expect(mockSendMail).not.toHaveBeenCalled();
    });
  });

  describe('Severity Filter Enforcement', () => {
    it('severityFilter: high - dispatches high risk and drops medium/low', async () => {
      (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
        id: orgA,
        name: 'Alpha Corp',
        alertEmail: JSON.stringify({
          recipients: ['sec@alpha.com'],
          enabled: true,
          severityFilter: 'high',
          hourlyRateLimit: 10,
        }),
      });

      // Low risk event -> suppressed
      const lowResult = await emailAlertService.sendAlert(orgA, {
        organizationId: orgA,
        agent: 'reader-agent',
        action: 'read_doc',
        status: 'flagged',
        risk: 'low',
        reason: 'Flagged for audit',
      });
      expect(lowResult).toBe(false);
      expect(mockSendMail).not.toHaveBeenCalled();

      // Medium risk event -> suppressed
      const mediumResult = await emailAlertService.sendAlert(orgA, {
        organizationId: orgA,
        agent: 'reader-agent',
        action: 'bulk_fetch',
        status: 'flagged',
        risk: 'medium',
        reason: 'Volume anomaly',
      });
      expect(mediumResult).toBe(false);
      expect(mockSendMail).not.toHaveBeenCalled();

      // High risk event -> dispatched
      const highResult = await emailAlertService.sendAlert(orgA, {
        organizationId: orgA,
        agent: 'reader-agent',
        action: 'exfiltrate_pii',
        status: 'blocked',
        risk: 'high',
        reason: 'PII exfiltration attempt',
      });
      expect(highResult).toBe(true);
      expect(mockSendMail).toHaveBeenCalledTimes(1);
    });

    it('severityFilter: medium_and_high - dispatches medium and high, drops low', async () => {
      (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
        id: orgA,
        name: 'Alpha Corp',
        alertEmail: JSON.stringify({
          recipients: ['sec@alpha.com'],
          enabled: true,
          severityFilter: 'medium_and_high',
          hourlyRateLimit: 10,
        }),
      });

      // Low risk -> suppressed
      const lowResult = await emailAlertService.sendAlert(orgA, {
        organizationId: orgA,
        agent: 'test-agent',
        action: 'routine_ping',
        status: 'flagged',
        risk: 'low',
        reason: 'Informational flag',
      });
      expect(lowResult).toBe(false);

      // Medium risk -> dispatched
      const mediumResult = await emailAlertService.sendAlert(orgA, {
        organizationId: orgA,
        agent: 'test-agent',
        action: 'anomalous_query',
        status: 'flagged',
        risk: 'medium',
        reason: 'Anomalous query rate',
      });
      expect(mediumResult).toBe(true);

      // High risk -> dispatched
      const highResult = await emailAlertService.sendAlert(orgA, {
        organizationId: orgA,
        agent: 'test-agent',
        action: 'drop_schema',
        status: 'blocked',
        risk: 'high',
        reason: 'Destructive command',
      });
      expect(highResult).toBe(true);
      expect(mockSendMail).toHaveBeenCalledTimes(2);
    });

    it('severityFilter: all - dispatches all risk levels', async () => {
      (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
        id: orgA,
        name: 'Alpha Corp',
        alertEmail: JSON.stringify({
          recipients: ['sec@alpha.com'],
          enabled: true,
          severityFilter: 'all',
          hourlyRateLimit: 10,
        }),
      });

      const lowResult = await emailAlertService.sendAlert(orgA, {
        organizationId: orgA,
        agent: 'test-agent',
        action: 'low_risk_action',
        status: 'flagged',
        risk: 'low',
        reason: 'Low risk audit note',
      });
      expect(lowResult).toBe(true);
      expect(mockSendMail).toHaveBeenCalledTimes(1);
    });
  });

  describe('Per-Organization Rate Limiting', () => {
    it('enforces hourly cap (10 emails/hour) and suppresses subsequent alerts with clear log line', async () => {
      const warnSpy = jest.spyOn(logger, 'warn');

      (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
        id: orgA,
        name: 'Alpha Corp',
        alertEmail: JSON.stringify({
          recipients: ['rate-test@alpha.com'],
          enabled: true,
          severityFilter: 'high',
          hourlyRateLimit: 10,
        }),
      });

      const baseEvent: DecisionAlertEvent = {
        organizationId: orgA,
        agent: 'stress-agent',
        action: 'repeated_block',
        status: 'blocked',
        risk: 'high',
        reason: 'Violation loop',
      };

      // Dispatch 10 alerts -> all should succeed
      for (let i = 0; i < 10; i++) {
        const sent = await emailAlertService.sendAlert(orgA, baseEvent);
        expect(sent).toBe(true);
      }
      expect(mockSendMail).toHaveBeenCalledTimes(10);

      // 11th alert -> must be suppressed
      const eleven = await emailAlertService.sendAlert(orgA, baseEvent);
      expect(eleven).toBe(false);
      expect(mockSendMail).toHaveBeenCalledTimes(10);

      // Verify clear log line when rate limited
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(`[AlertEmail] Rate limit exceeded for org ${orgA}`)
      );
    });

    it('isolates rate limits between tenants so Org A exhaustion does not block Org B', async () => {
      (prisma.organizations.findUnique as jest.Mock).mockImplementation(({ where }) => {
        if (where.id === orgA) {
          return Promise.resolve({
            id: orgA,
            name: 'Alpha Corp',
            alertEmail: JSON.stringify({
              recipients: ['alpha@alpha.com'],
              enabled: true,
              severityFilter: 'high',
              hourlyRateLimit: 2,
            }),
          });
        }
        if (where.id === orgB) {
          return Promise.resolve({
            id: orgB,
            name: 'Beta Corp',
            alertEmail: JSON.stringify({
              recipients: ['beta@beta.com'],
              enabled: true,
              severityFilter: 'high',
              hourlyRateLimit: 2,
            }),
          });
        }
        return Promise.resolve(null);
      });

      const eventA: DecisionAlertEvent = {
        organizationId: orgA,
        agent: 'agent-a',
        action: 'act-a',
        status: 'blocked',
        risk: 'high',
        reason: 'Blocked A',
      };

      const eventB: DecisionAlertEvent = {
        organizationId: orgB,
        agent: 'agent-b',
        action: 'act-b',
        status: 'blocked',
        risk: 'high',
        reason: 'Blocked B',
      };

      // Org A consumes its limit of 2
      expect(await emailAlertService.sendAlert(orgA, eventA)).toBe(true);
      expect(await emailAlertService.sendAlert(orgA, eventA)).toBe(true);
      expect(await emailAlertService.sendAlert(orgA, eventA)).toBe(false); // Org A blocked

      // Org B should still be allowed to send its alerts
      expect(await emailAlertService.sendAlert(orgB, eventB)).toBe(true);
      expect(await emailAlertService.sendAlert(orgB, eventB)).toBe(true);
      expect(await emailAlertService.sendAlert(orgB, eventB)).toBe(false); // Org B now blocked
    });
  });

  describe('Secret Protection & PII Redaction in Logs', () => {
    it('never prints SMTP secrets or full raw email addresses in logs', async () => {
      const infoSpy = jest.spyOn(logger, 'info');
      const warnSpy = jest.spyOn(logger, 'warn');
      const errorSpy = jest.spyOn(logger, 'error');

      const rawSecret = process.env.SMTP_PASS as string;
      const rawEmail = 'confidential.user@alpha-enterprise.com';

      (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
        id: orgA,
        name: 'Alpha Corp',
        alertEmail: JSON.stringify({
          recipients: [rawEmail],
          enabled: true,
          severityFilter: 'high',
          hourlyRateLimit: 10,
        }),
      });

      await emailAlertService.sendAlert(orgA, {
        organizationId: orgA,
        agent: 'audit-bot',
        action: 'view_financial_record',
        status: 'blocked',
        risk: 'high',
        reason: 'Financial compliance rule',
      });

      const allLoggedMessages: string[] = [
        ...infoSpy.mock.calls.map(c => String(c[0])),
        ...warnSpy.mock.calls.map(c => String(c[0])),
        ...errorSpy.mock.calls.map(c => String(c[0])),
      ];

      for (const logMsg of allLoggedMessages) {
        // Assert password / secrets are NEVER logged
        expect(logMsg).not.toContain(rawSecret);
        // Assert full email address is masked (not printed in full)
        expect(logMsg).not.toContain(rawEmail);
        // But masked email is acceptable
        if (logMsg.includes('[AlertEmail]')) {
          expect(logMsg).toMatch(/c\*\*\*@alpha-enterprise\.com|recipients/);
        }
      }
    });
  });

  describe('Send Test Email Feature', () => {
    it('dispatches a test email successfully to configured recipients', async () => {
      (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
        id: orgA,
        name: 'Alpha Corp',
        alertEmail: JSON.stringify({
          recipients: ['admin@alpha.com'],
          enabled: true,
          severityFilter: 'high',
          hourlyRateLimit: 10,
        }),
      });

      const result = await emailAlertService.sendTestEmail(orgA);
      expect(result.success).toBe(true);
      expect(result.message).toContain('Test alert email sent');
      expect(mockSendMail).toHaveBeenCalledTimes(1);

      const mailCall = mockSendMail.mock.calls[0][0];
      expect(mailCall.to).toEqual(['admin@alpha.com']);
      expect(mailCall.subject).toContain('Test Alert for Alpha Corp');
      expect(mailCall.html).toContain('🧪 Sentra AI: Test Email Alert');
    });

    it('allows testing with an override recipient', async () => {
      (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
        id: orgA,
        name: 'Alpha Corp',
      });

      const result = await emailAlertService.sendTestEmail(orgA, 'on-demand-test@alpha.com');
      expect(result.success).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['on-demand-test@alpha.com'],
        })
      );
    });

    it('rejects test emails when no recipients are configured and none provided', async () => {
      (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
        id: orgA,
        name: 'Alpha Corp',
        alertEmail: null,
      });

      await expect(emailAlertService.sendTestEmail(orgA)).rejects.toThrow(
        'No email alert recipients configured'
      );
    });

    it('enforces test rate limit (5 test emails per 10 minutes)', async () => {
      (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
        id: orgA,
        name: 'Alpha Corp',
        alertEmail: JSON.stringify({
          recipients: ['test-limit@alpha.com'],
          enabled: true,
          severityFilter: 'high',
          hourlyRateLimit: 10,
        }),
      });

      // 5 tests succeed
      for (let i = 0; i < 5; i++) {
        const res = await emailAlertService.sendTestEmail(orgA);
        expect(res.success).toBe(true);
      }

      // 6th test triggers rate limit rejection
      await expect(emailAlertService.sendTestEmail(orgA)).rejects.toThrow(
        'Rate limit exceeded: Too many test alert requests'
      );
    });

    it('rejects test emails when override recipient format is invalid', async () => {
      (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
        id: orgA,
        name: 'Alpha Corp',
      });

      await expect(emailAlertService.sendTestEmail(orgA, 'invalid-email-address')).rejects.toThrow(
        'Invalid recipient email address'
      );
    });

    it('rejects test emails when SMTP transporter is not configured', async () => {
      const originalHost = process.env.SMTP_HOST;
      try {
        delete process.env.SMTP_HOST;
        (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
          id: orgA,
          name: 'Alpha Corp',
          alertEmail: JSON.stringify({
            recipients: ['valid@alpha.com'],
            enabled: true,
          }),
        });

        await expect(emailAlertService.sendTestEmail(orgA)).rejects.toThrow(
          'SMTP transporter is not configured'
        );
      } finally {
        process.env.SMTP_HOST = originalHost;
      }
    });

    it('skips alert dispatch and returns false when SMTP transport is not configured', async () => {
      const originalHost = process.env.SMTP_HOST;
      try {
        delete process.env.SMTP_HOST;
        (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
          id: orgA,
          name: 'Alpha Corp',
          alertEmail: JSON.stringify({
            recipients: ['sec@alpha.com'],
            enabled: true,
            severityFilter: 'high',
          }),
        });

        const result = await emailAlertService.sendAlert(orgA, {
          organizationId: orgA,
          agent: 'agent-1',
          action: 'exfil',
          status: 'blocked',
          risk: 'high',
          reason: 'Policy block',
        });

        expect(result).toBe(false);
      } finally {
        process.env.SMTP_HOST = originalHost;
      }
    });

    it('returns false and logs error when transporter sendMail throws', async () => {
      (prisma.organizations.findUnique as jest.Mock).mockResolvedValue({
        id: orgA,
        name: 'Alpha Corp',
        alertEmail: JSON.stringify({
          recipients: ['sec@alpha.com'],
          enabled: true,
          severityFilter: 'high',
        }),
      });

      mockSendMail.mockRejectedValueOnce(new Error('Connection reset by peer'));

      const result = await emailAlertService.sendAlert(orgA, {
        organizationId: orgA,
        agent: 'agent-1',
        action: 'exfil',
        status: 'blocked',
        risk: 'high',
        reason: 'Policy block',
      });

      expect(result).toBe(false);
    });
  });
});

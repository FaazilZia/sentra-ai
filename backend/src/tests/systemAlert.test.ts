import nodemailer from 'nodemailer';
import { systemAlertService } from '../services/systemAlert.service';

jest.mock('nodemailer');

describe('System Alert Service - Operational Alerts', () => {
  let originalSlackUrl: string | undefined;
  let originalSmtpHost: string | undefined;
  let originalSmtpPort: string | undefined;
  let originalFetch: typeof global.fetch;

  let sendMailMock: jest.Mock;

  beforeEach(() => {
    originalSlackUrl = process.env.SLACK_WEBHOOK_URL;
    originalSmtpHost = process.env.SMTP_HOST;
    originalSmtpPort = process.env.SMTP_PORT;
    originalFetch = global.fetch;

    sendMailMock = jest.fn().mockResolvedValue({ messageId: 'test-id' });
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: sendMailMock,
    });
  });

  afterEach(() => {
    process.env.SLACK_WEBHOOK_URL = originalSlackUrl;
    process.env.SMTP_HOST = originalSmtpHost;
    process.env.SMTP_PORT = originalSmtpPort;
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  describe('Alert Dispatching & Throttling', () => {
    it('skips Slack and Email delivery when env vars are not set', async () => {
      delete process.env.SLACK_WEBHOOK_URL;
      delete process.env.SMTP_HOST;

      const res = await systemAlertService.sendAlert({
        type: 'service_down',
        severity: 'critical',
        title: 'Service Down',
        message: 'Fatal crash',
      }, true);

      expect(res.slack).toBe(false);
      expect(res.email).toBe(false);
      expect(res.errors).toEqual([]);
    });

    it('throttles rapid duplicate alerts when force is false', async () => {
      delete process.env.SLACK_WEBHOOK_URL;
      delete process.env.SMTP_HOST;

      const res1 = await systemAlertService.sendAlert({
        type: 'dlq_growing',
        severity: 'warning',
        title: 'DLQ Alert 1',
        message: 'Jobs failing',
      }, true);
      expect(res1.errors).toEqual([]);

      // Second immediate call without force should be throttled
      const res2 = await systemAlertService.sendAlert({
        type: 'dlq_growing',
        severity: 'warning',
        title: 'DLQ Alert 2',
        message: 'Jobs still failing',
      }, false);

      expect(res2.slack).toBe(false);
      expect(res2.email).toBe(false);
      expect(res2.errors).toContain('Throttled');
    });

    it('bypasses throttling when force=true', async () => {
      delete process.env.SLACK_WEBHOOK_URL;
      delete process.env.SMTP_HOST;

      const res1 = await systemAlertService.sendAlert({
        type: 'connector_scan_failing_repeatedly',
        severity: 'critical',
        title: 'Connector failed 1',
        message: 'Failed',
      }, true);
      expect(res1.errors).toEqual([]);

      const res2 = await systemAlertService.sendAlert({
        type: 'connector_scan_failing_repeatedly',
        severity: 'critical',
        title: 'Connector failed 2',
        message: 'Failed again',
      }, true);

      expect(res2.errors).toEqual([]);
    });
  });

  describe('Slack Delivery', () => {
    it('dispatches to Slack successfully for critical, warning, and info severities with details', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/T00/B00/X00';
      delete process.env.SMTP_HOST;

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => 'ok',
      });
      global.fetch = mockFetch as any;

      // 1. Critical severity
      const resCrit = await systemAlertService.sendAlert({
        type: 'service_down',
        severity: 'critical',
        title: 'Critical Outage',
        message: 'Server down',
        details: { code: 500, meta: { reason: 'OOM' } },
      }, true);

      expect(resCrit.slack).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const critBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(critBody.text).toContain('🔥');
      expect(critBody.blocks[1].text.text).toContain('CRITICAL');

      // 2. Warning severity
      mockFetch.mockClear();
      const resWarn = await systemAlertService.sendAlert({
        type: 'error_rate_spike',
        severity: 'warning',
        title: 'Warning Spike',
        message: '5xx spike',
      }, true);

      expect(resWarn.slack).toBe(true);
      const warnBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(warnBody.text).toContain('⚠️');

      // 3. Info severity with > 10 detail fields (testing slice to 10)
      mockFetch.mockClear();
      const manyDetails: Record<string, string> = {};
      for (let i = 0; i < 15; i++) {
        manyDetails[`field_${i}`] = `value_${i}`;
      }

      const resInfo = await systemAlertService.sendAlert({
        type: 'schema_drift',
        severity: 'info',
        title: 'Info Notice',
        message: 'Notice details',
        details: manyDetails,
      }, true);

      expect(resInfo.slack).toBe(true);
      const infoBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(infoBody.text).toContain('ℹ️');
      expect(infoBody.blocks[2].fields).toHaveLength(10);
    });

    it('captures Slack HTTP error responses and appends to result.errors', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/T00/B00/X00';
      delete process.env.SMTP_HOST;

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'invalid_payload',
      }) as any;

      const res = await systemAlertService.sendAlert({
        type: 'service_down',
        severity: 'critical',
        title: 'Test Error',
        message: 'Simulated slack fail',
      }, true);

      expect(res.slack).toBe(false);
      expect(res.errors[0]).toContain('Slack API responded with status 400: invalid_payload');
    });

    it('captures Slack network exceptions and appends to result.errors', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/T00/B00/X00';
      delete process.env.SMTP_HOST;

      global.fetch = jest.fn().mockRejectedValue(new Error('DNS resolution failed')) as any;

      const res = await systemAlertService.sendAlert({
        type: 'service_down',
        severity: 'critical',
        title: 'Test Network Error',
        message: 'Simulated network fail',
      }, true);

      expect(res.slack).toBe(false);
      expect(res.errors[0]).toContain('Slack dispatch failed: DNS resolution failed');
    });
  });

  describe('Email Delivery', () => {
    it('dispatches email successfully with HTML formatting for different severities and ports', async () => {
      delete process.env.SLACK_WEBHOOK_URL;
      process.env.SMTP_HOST = 'smtp.sendgrid.net';
      process.env.SMTP_PORT = '465'; // Test port 465 secure: true
      process.env.ALERT_EMAIL = 'ops@sentra.ai';

      const res1 = await systemAlertService.sendAlert({
        type: 'ready_failing',
        severity: 'critical',
        title: 'Readiness failed',
        message: 'Database check failed',
        details: { db: 'unreachable', query: { text: 'SELECT 1' } },
      }, true);

      expect(res1.email).toBe(true);
      expect(sendMailMock).toHaveBeenCalledTimes(1);
      const mailCall = sendMailMock.mock.calls[0][0];
      expect(mailCall.to).toBe('ops@sentra.ai');
      expect(mailCall.subject).toContain('[CRITICAL]');
      expect(mailCall.html).toContain('Database check failed');
      expect(mailCall.html).toContain('unreachable');

      // Test port 587 secure: false with warning severity
      process.env.SMTP_PORT = '587';
      delete process.env.ALERT_EMAIL;
      process.env.ADMIN_EMAIL = 'admin@sentra.ai';

      sendMailMock.mockClear();
      const res2 = await systemAlertService.sendAlert({
        type: 'error_rate_spike',
        severity: 'warning',
        title: 'High error rate',
        message: 'HTTP 500 count elevated',
      }, true);

      expect(res2.email).toBe(true);
      expect(sendMailMock).toHaveBeenCalledTimes(1);
      expect(sendMailMock.mock.calls[0][0].subject).toContain('[WARNING]');
    });

    it('captures email transport errors and appends to result.errors', async () => {
      delete process.env.SLACK_WEBHOOK_URL;
      process.env.SMTP_HOST = 'smtp.sendgrid.net';

      sendMailMock.mockRejectedValue(new Error('SMTP authentication failed'));

      const res = await systemAlertService.sendAlert({
        type: 'service_down',
        severity: 'critical',
        title: 'Email error test',
        message: 'Testing email failure handling',
      }, true);

      expect(res.email).toBe(false);
      expect(res.errors[0]).toContain('Email dispatch failed: SMTP authentication failed');
    });
  });

  describe('Trigger Handlers', () => {
    beforeEach(() => {
      delete process.env.SLACK_WEBHOOK_URL;
      delete process.env.SMTP_HOST;
    });

    it('triggerServiceDownAlert sanitizes and sends alert', async () => {
      const res = await systemAlertService.triggerServiceDownAlert(
        'Database connection refused at postgresql://user:pass@host:5432/db',
        { extraInfo: 'secret-token-123' }
      );
      expect(res).toBeDefined();
    });

    it('triggerReadyFailingAlert sends alert with checks details and fallback error message', async () => {
      const res1 = await systemAlertService.triggerReadyFailingAlert(
        { db: 'failed', redis: 'ok', queue: 'ok', schema: 'drift' },
        'DB Connection Timeout'
      );
      expect(res1).toBeDefined();

      const res2 = await systemAlertService.triggerReadyFailingAlert(
        { db: 'failed', redis: 'failed', queue: 'failed' }
      );
      expect(res2).toBeDefined();
    });

    it('triggerSchemaDriftAlert formats missing columns summary', async () => {
      const res = await systemAlertService.triggerSchemaDriftAlert([
        { table: 'connectors', column: 'last_error' },
        { table: 'users', column: 'mfa_secret' },
      ]);
      expect(res).toBeDefined();
    });

    it('triggerErrorRateSpikeAlert formats error rate percentages', async () => {
      const res = await systemAlertService.triggerErrorRateSpikeAlert(0.085, 0.05);
      expect(res).toBeDefined();
    });

    it('triggerDLQGrowingAlert formats failed job count and threshold', async () => {
      const res = await systemAlertService.triggerDLQGrowingAlert('inbound-scans', 12, 5);
      expect(res).toBeDefined();
    });

    it('triggerConnectorScanFailingAlert formats connector details and error', async () => {
      const res = await systemAlertService.triggerConnectorScanFailingAlert(
        'conn-456',
        'Salesforce CRM',
        5,
        'OAuth token expired'
      );
      expect(res).toBeDefined();
    });

    it('sendTestAlert executes with force=true for default and custom alert types', async () => {
      const res1 = await systemAlertService.sendTestAlert();
      expect(res1).toBeDefined();

      const res2 = await systemAlertService.sendTestAlert('schema_drift');
      expect(res2).toBeDefined();
    });
  });
});

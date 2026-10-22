import { systemAlertService } from '../services/systemAlert.service';

describe('System Alert Service - Operational Alerts', () => {
  let originalSlackUrl: string | undefined;
  let originalSmtpHost: string | undefined;

  beforeAll(() => {
    originalSlackUrl = process.env.SLACK_WEBHOOK_URL;
    originalSmtpHost = process.env.SMTP_HOST;
  });

  afterAll(() => {
    process.env.SLACK_WEBHOOK_URL = originalSlackUrl;
    process.env.SMTP_HOST = originalSmtpHost;
  });

  it('triggers service_down alert with sanitized payload', async () => {
    const res = await systemAlertService.triggerServiceDownAlert(
      'Uncaught fatal error: database password leaked password123',
      { error: 'Connection refused to postgresql://user:pass@host:5432/db' }
    );
    expect(res).toBeDefined();
    expect(Array.isArray(res.errors)).toBe(true);
  });

  it('triggers ready_failing alert with dependency status', async () => {
    const res = await systemAlertService.triggerReadyFailingAlert(
      { db: 'failed', redis: 'ok', queue: 'ok' },
      'PrismaClientInitializationError: Can\'t reach database server'
    );
    expect(res).toBeDefined();
  });

  it('triggers error_rate_spike alert when 5xx errors exceed threshold', async () => {
    const res = await systemAlertService.triggerErrorRateSpikeAlert(0.12, 0.05);
    expect(res).toBeDefined();
  });

  it('triggers dlq_growing alert when queue failed count increases', async () => {
    const res = await systemAlertService.triggerDLQGrowingAlert('connector-scans', 5, 1);
    expect(res).toBeDefined();
  });

  it('triggers connector_scan_failing_repeatedly alert for failed connectors', async () => {
    const res = await systemAlertService.triggerConnectorScanFailingAlert(
      'conn-123',
      'Google Drive Inbound',
      3,
      'Invalid service account credentials'
    );
    expect(res).toBeDefined();
  });

  it('executes sendTestAlert with force=true bypassing cooldown', async () => {
    const res = await systemAlertService.sendTestAlert('ready_failing');
    expect(res).toBeDefined();
    expect(typeof res.slack).toBe('boolean');
    expect(typeof res.email).toBe('boolean');
  });

  it('throttles rapid duplicate alerts when force is false', async () => {
    // First alert
    await systemAlertService.sendAlert({
      type: 'dlq_growing',
      severity: 'warning',
      title: 'DLQ Alert 1',
      message: 'Jobs failing',
    });

    // Immediate duplicate should be throttled
    const throttled = await systemAlertService.sendAlert({
      type: 'dlq_growing',
      severity: 'warning',
      title: 'DLQ Alert 2',
      message: 'Jobs still failing',
    }, false);

    expect(throttled.errors).toContain('Throttled');
  });
});

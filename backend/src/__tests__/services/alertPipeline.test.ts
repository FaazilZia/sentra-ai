jest.mock('../../config/db', () => ({
  __esModule: true,
  default: {
    slack_config: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
    organizations: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@slack/webhook', () => {
  return {
    IncomingWebhook: jest.fn().mockImplementation(() => ({
      send: jest.fn().mockResolvedValue({ text: 'ok' }),
    })),
  };
});

import prisma from '../../config/db';
import { IncomingWebhook } from '@slack/webhook';
import { alertPipeline, processAlertJob } from '../../services/alertPipeline.service';
import { SlackService } from '../../services/slack.service';
import { encryptCredentials } from '../../utils/credentialHelper';

describe('Alert Pipeline & Slack Integration', () => {
  const orgId = 'org-test-777';
  const rawWebhookUrl = 'https://hooks.slack.com/services/T11/B22/SEC33';
  const encryptedWebhookUrl = encryptCredentials(rawWebhookUrl);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('saves Slack config with encrypted webhook URL and decrypts on getConfig', async () => {
    (prisma.slack_config.upsert as jest.Mock).mockResolvedValue({
      id: 'sc-1',
      orgId,
      webhookUrl: encryptedWebhookUrl,
      channel: '#alerts-security',
      enabled: true,
      notifyOn: ['guardrail_block'],
    });

    const saved = await SlackService.saveConfig(orgId, {
      webhookUrl: rawWebhookUrl,
      channel: '#alerts-security',
      enabled: true,
      notifyOn: ['guardrail_block'],
    });

    expect(prisma.slack_config.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { orgId },
      update: expect.objectContaining({
        channel: '#alerts-security',
      }),
    }));

    (prisma.slack_config.findUnique as jest.Mock).mockResolvedValue({
      id: 'sc-1',
      orgId,
      webhookUrl: encryptedWebhookUrl,
      channel: '#alerts-security',
      enabled: true,
      notifyOn: ['guardrail_block'],
    });

    const config = await SlackService.getConfig(orgId);
    expect(config?.webhookUrl).toBe(rawWebhookUrl);
  });

  it('dispatches Block Kit card to Slack on BLOCKED decision', async () => {
    (prisma.slack_config.findUnique as jest.Mock).mockResolvedValue({
      id: 'sc-1',
      orgId,
      webhookUrl: encryptedWebhookUrl,
      channel: '#alerts-security',
      enabled: true,
      notifyOn: ['guardrail_block'],
    });

    await processAlertJob({
      organizationId: orgId,
      agent: 'customer-support-bot',
      action: 'drop_database',
      status: 'blocked',
      risk: 'high',
      reason: 'Unauthorized database deletion detected',
      matchedPolicy: 'Database Protection Guardrail',
      compliance: ['SOC2', 'ISO_27001'],
      source: 'interceptor',
    });

    expect(IncomingWebhook).toHaveBeenCalledWith(rawWebhookUrl);
    const mockInstance = (IncomingWebhook as jest.Mock).mock.results[0].value;
    expect(mockInstance.send).toHaveBeenCalledWith(expect.objectContaining({
      text: expect.stringContaining('BLOCKED'),
      channel: '#alerts-security',
      blocks: expect.arrayContaining([
        expect.objectContaining({
          type: 'header',
          text: expect.objectContaining({ text: expect.stringContaining('Action BLOCKED') }),
        }),
      ]),
    }));
  });

  it('dispatches Block Kit card to Slack on FLAGGED decision', async () => {
    (prisma.slack_config.findUnique as jest.Mock).mockResolvedValue({
      id: 'sc-1',
      orgId,
      webhookUrl: encryptedWebhookUrl,
      channel: '#alerts-security',
      enabled: true,
      notifyOn: ['guardrail_block'],
    });

    await processAlertJob({
      organizationId: orgId,
      agent: 'finance-assistant',
      action: 'export_anomalous_report',
      status: 'flagged',
      risk: 'medium',
      reason: 'Anomalous export volume flagged for review',
      matchedPolicy: 'Volume Anomaly Policy',
      compliance: ['DPDP'],
      source: 'interceptor',
    });

    const mockInstance = (IncomingWebhook as jest.Mock).mock.results[0].value;
    expect(mockInstance.send).toHaveBeenCalledWith(expect.objectContaining({
      text: expect.stringContaining('FLAGGED'),
      blocks: expect.arrayContaining([
        expect.objectContaining({
          type: 'header',
          text: expect.objectContaining({ text: expect.stringContaining('Action FLAGGED') }),
        }),
      ]),
    }));
  });

  it('never throws or interrupts caller if Slack webhook endpoint is down', async () => {
    (prisma.slack_config.findUnique as jest.Mock).mockResolvedValue({
      id: 'sc-1',
      orgId,
      webhookUrl: encryptedWebhookUrl,
      channel: '#alerts-security',
      enabled: true,
      notifyOn: [],
    });

    (IncomingWebhook as jest.Mock).mockImplementationOnce(() => ({
      send: jest.fn().mockRejectedValue(new Error('Slack server 500 error')),
    }));

    await expect(alertPipeline.dispatchDecisionAlert({
      organizationId: orgId,
      agent: 'agent-x',
      action: 'unsafe_cmd',
      status: 'blocked',
      risk: 'high',
      reason: 'Failed safely',
    })).resolves.not.toThrow();
  });
});

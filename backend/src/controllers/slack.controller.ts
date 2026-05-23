import { Response } from 'express';
import { SlackService } from '../services/slack.service';
import { resolveOrganizationId } from '../utils/company';
import { asyncHandler, sendSuccess, sendError } from '../utils/controllerHelpers';

export const getSlackConfig = asyncHandler(async (req: any, res: Response) => {
  const orgId = await resolveOrganizationId(req);
  if (!orgId) return sendError(res, 401, 'Unauthorized');

  const config = await SlackService.getConfig(orgId);
  return sendSuccess(res, config || { enabled: false, webhookUrl: '', channel: '', notifyOn: [] });
});

export const saveSlackConfig = asyncHandler(async (req: any, res: Response) => {
  const orgId = await resolveOrganizationId(req);
  if (!orgId) return sendError(res, 401, 'Unauthorized');

  const { webhookUrl, channel, enabled, notifyOn } = req.body;
  if (!webhookUrl || !channel) {
    return sendError(res, 400, 'Webhook URL and Channel are required');
  }

  const config = await SlackService.saveConfig(orgId, {
    webhookUrl,
    channel,
    enabled,
    notifyOn: notifyOn || []
  });

  return sendSuccess(res, config, 200, 'Slack configuration saved successfully');
});

export const deleteSlackConfig = asyncHandler(async (req: any, res: Response) => {
  const orgId = await resolveOrganizationId(req);
  if (!orgId) return sendError(res, 401, 'Unauthorized');

  await SlackService.deleteConfig(orgId);
  return sendSuccess(res, null, 200, 'Slack configuration deleted');
});

export const testSlackConnection = asyncHandler(async (req: any, res: Response) => {
  const { webhookUrl, channel } = req.body;
  if (!webhookUrl || !channel) {
    return sendError(res, 400, 'Webhook URL and Channel are required for connection test');
  }

  try {
    await SlackService.testConnection(webhookUrl, channel);
    return sendSuccess(res, null, 200, 'Test message sent successfully');
  } catch (error: any) {
    return sendError(res, 500, `Connection test failed: ${error.message || error}`);
  }
});

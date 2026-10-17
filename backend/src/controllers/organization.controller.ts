import { Response } from 'express';
import prisma from '../config/db';
import { resolveOrganizationId } from '../utils/company';
import { asyncHandler, sendSuccess, sendError } from '../utils/controllerHelpers';
import { alertService } from '../services/alert.service';
import logger from '../utils/logger';

export const getOrganizationById = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const requestOrganizationId = await resolveOrganizationId(req);
  if (requestOrganizationId && id !== requestOrganizationId) {
    return sendError(res, 403, 'Forbidden');
  }

  const company = await prisma.organizations.findUnique({
    where: { id },
  });

  if (!company) {
    return sendError(res, 404, 'Organization not found');
  }

  return sendSuccess(res, company);
});

export const getSdkStatus = asyncHandler(async (req: any, res: Response) => {
  const requestOrganizationId = await resolveOrganizationId(req);
  const targetId = req.params?.id || requestOrganizationId;

  if (!targetId) {
    return sendError(res, 401, 'Unauthorized: Organization not identified');
  }

  if (requestOrganizationId && targetId !== requestOrganizationId && req.user?.role !== 'SUPERADMIN') {
    return sendError(res, 403, 'Forbidden');
  }

  const org = await prisma.organizations.findUnique({
    where: { id: targetId },
    select: { sdkConnectedAt: true }
  });

  if (!org) {
    return sendError(res, 404, 'Organization not found');
  }

  return sendSuccess(res, {
    connected: Boolean(org.sdkConnectedAt),
    connectedAt: org.sdkConnectedAt || null,
    firstConnectedAt: org.sdkConnectedAt || null
  });
});

export const updateAlertSettings = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) {
    return sendError(res, 401, 'Unauthorized');
  }

  const { alertEmail, slackWebhookUrl } = req.body;

  // Basic validation
  const isValidEmail = (email: string): boolean => {
    if (!email || email.length > 254) return false;
    const parts = email.split('@');
    if (parts.length !== 2) return false;
    return parts[0].length > 0 && parts[1].includes('.');
  };

  const isValidSlackWebhook = (url: string): boolean =>
    url.startsWith('https://hooks.slack.com/');

  if (alertEmail && !isValidEmail(alertEmail)) {
    return sendError(res, 400, 'Invalid email format');
  }
  if (slackWebhookUrl && !isValidSlackWebhook(slackWebhookUrl)) {
    return sendError(res, 400, 'Invalid Slack webhook URL');
  }

  const updated = await prisma.organizations.update({
    where: { id: organizationId },
    data: {
      alertEmail: alertEmail || null,
      slackWebhookUrl: slackWebhookUrl || null,
      updated_at: new Date()
    }
  });

  if (slackWebhookUrl) {
    try {
      const { SlackService } = require('../services/slack.service');
      await SlackService.saveConfig(organizationId, {
        webhookUrl: slackWebhookUrl,
        channel: '#alerts-compliance',
        enabled: true,
        notifyOn: ['guardrail_block', 'policy_violation', 'incident_created']
      });
    } catch (syncErr) {
      logger.error('[OrgController] Failed to sync slack_config:', syncErr);
    }
  }

  return sendSuccess(res, updated, 200, 'Alert settings updated successfully');
});

export const testAlert = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) {
    return sendError(res, 401, 'Unauthorized');
  }

  const dummyDecision = {
    status: 'blocked',
    risk: 'high',
    reason: 'This is a test notification from the Sentraa AI dashboard.',
    compliance: ['TEST_POLICY'],
    explanation: 'Verifying that your alert channels are correctly configured.'
  };

  alertService.notify(organizationId, dummyDecision, 'Test Agent', 'TEST_ACTION');

  return sendSuccess(res, undefined, 200, 'Test alerts dispatched');
});


import { Response } from 'express';
import prisma from '../config/db';
import { resolveOrganizationId } from '../utils/company';
import { asyncHandler, sendSuccess, sendError } from '../utils/controllerHelpers';
import { alertService } from '../services/alert.service';

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
    reason: 'This is a test notification from the Sentra AI dashboard.',
    compliance: ['TEST_POLICY'],
    explanation: 'Verifying that your alert channels are correctly configured.'
  };

  alertService.notify(organizationId, dummyDecision, 'Test Agent', 'TEST_ACTION');

  return sendSuccess(res, undefined, 200, 'Test alerts dispatched');
});


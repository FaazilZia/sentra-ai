import { Response } from 'express';
import prisma from '../config/db';
import { resolveOrganizationId } from '../utils/company';
import { asyncHandler, sendSuccess, sendError } from '../utils/controllerHelpers';

export const createAlertRule = asyncHandler(async (req: any, res: Response) => {
  const { threshold_count, time_window_minutes, webhook_url } = req.body;
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');

  if (!threshold_count || !time_window_minutes || !webhook_url) {
    return sendError(res, 400, 'Missing required fields');
  }

  const rule = await prisma.alert_rules.create({
    data: {
      organizationId,
      threshold_count: Number.parseInt(threshold_count, 10),
      time_window_minutes: Number.parseInt(time_window_minutes, 10),
      webhook_url
    }
  });

  return sendSuccess(res, rule, 201);
});

export const getAlertRules = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');

  const rules = await prisma.alert_rules.findMany({
    where: { organizationId },
    orderBy: { created_at: 'desc' }
  });

  return sendSuccess(res, rules, 200);
});

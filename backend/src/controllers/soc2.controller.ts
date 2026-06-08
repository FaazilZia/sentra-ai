import { Response } from 'express';
import { Soc2Service } from '../services/soc2.service';
import { resolveOrganizationId } from '../utils/company';
import { asyncHandler, sendSuccess, sendError } from '../utils/controllerHelpers';

export const getChapters = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');

  const chapters = await Soc2Service.getChapters(organizationId);
  return sendSuccess(res, chapters);
});

export const getFrameworkControls = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');

  const controls = await Soc2Service.getFrameworkControls(organizationId);
  return sendSuccess(res, controls);
});

export const getStats = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');

  const stats = await Soc2Service.getStats(organizationId);
  return sendSuccess(res, stats);
});

export const updateControl = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');

  const { id } = req.params;
  const { status, notes } = req.body;

  if (!status) return sendError(res, 400, 'Status is required');

  try {
    const updated = await Soc2Service.updateControl(organizationId, id, { status, notes });
    return sendSuccess(res, updated);
  } catch (error: any) {
    return sendError(res, 400, error.message || 'Failed to update control');
  }
});

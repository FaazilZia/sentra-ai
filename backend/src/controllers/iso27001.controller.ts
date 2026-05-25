import { Response } from 'express';
import { Iso27001Service } from '../services/iso27001.service';
import { asyncHandler, sendSuccess, sendError, getOrgId } from '../utils/controllerHelpers';

export const getFrameworkOverview = asyncHandler(async (req: any, res: Response) => {
  const organizationId = getOrgId(req);
  const overview = await Iso27001Service.getFrameworkOverview(organizationId);
  return sendSuccess(res, overview);
});

export const updateImplementation = asyncHandler(async (req: any, res: Response) => {
  const { controlCode } = req.params;
  const { status, notes, due_date } = req.body;
  if (!status) {
    return sendError(res, 400, 'status is required');
  }
  const organizationId = getOrgId(req);
  try {
    const updated = await Iso27001Service.updateImplementation(organizationId, controlCode, {
      status,
      notes,
      due_date: due_date ? new Date(due_date) : undefined
    });
    return sendSuccess(res, updated);
  } catch (err: any) {
    return sendError(res, 404, err.message);
  }
});

export const getComplianceScore = asyncHandler(async (req: any, res: Response) => {
  const organizationId = getOrgId(req);
  const overview = await Iso27001Service.getFrameworkOverview(organizationId);
  return sendSuccess(res, { compliance_score: overview.summary.compliance_score });
});

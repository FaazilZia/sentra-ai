import { Response } from 'express';
import { CeMarkingService } from '../services/ceMarking.service';
import { asyncHandler, sendSuccess, sendError } from '../utils/controllerHelpers';
import { resolveOrganizationId } from '../utils/company';

export const listCeMarkingRecords = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 400, 'Organization context required');
  const records = await CeMarkingService.listForOrg(organizationId);
  return sendSuccess(res, { data: records });
});

export const getOrCreateCeMarking = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  const { aiSystemId } = req.params;
  if (!organizationId) return sendError(res, 400, 'Organization context required');
  const record = await CeMarkingService.getOrCreate(organizationId, aiSystemId);
  return sendSuccess(res, { data: record });
});

export const updateCeMarkingStep = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  const { aiSystemId } = req.params;
  const { step, status, notes } = req.body;
  if (!organizationId) return sendError(res, 400, 'Organization context required');
  if (!step || !status) return sendError(res, 400, 'step and status are required');
  const record = await CeMarkingService.updateStep(organizationId, aiSystemId, step, status, notes);
  return sendSuccess(res, { data: record });
});

export const updateCeMarkingClassification = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  const { aiSystemId } = req.params;
  const { classification, scopeNotes } = req.body;
  if (!organizationId) return sendError(res, 400, 'Organization context required');
  const record = await CeMarkingService.updateClassification(organizationId, aiSystemId, classification, scopeNotes);
  return sendSuccess(res, { data: record });
});

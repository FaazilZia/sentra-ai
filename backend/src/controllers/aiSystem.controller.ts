import { Response } from 'express';
import { AISystemService } from '../services/aiSystem.service';
import { resolveOrganizationId } from '../utils/company';
import { asyncHandler, sendSuccess, sendError } from '../utils/controllerHelpers';

export const listAISystems = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) {
    return sendError(res, 400, 'Company context required');
  }

  const items = await AISystemService.list(organizationId);
  return sendSuccess(res, { items });
});

export const getAISystem = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) {
    return sendError(res, 400, 'Company context required');
  }

  const { id } = req.params;
  const item = await AISystemService.get(id, organizationId);
  if (!item) {
    return sendError(res, 404, 'AI System not found');
  }

  return sendSuccess(res, item);
});

export const createAISystem = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) {
    return sendError(res, 400, 'Company context required');
  }

  const item = await AISystemService.create(organizationId, req.body);
  return sendSuccess(res, item, 201);
});

export const updateAISystem = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) {
    return sendError(res, 400, 'Company context required');
  }

  const { id } = req.params;
  const item = await AISystemService.update(id, organizationId, req.body);
  if (!item) {
    return sendError(res, 404, 'AI System not found or not updated');
  }

  return sendSuccess(res, item);
});

export const deleteAISystem = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) {
    return sendError(res, 400, 'Company context required');
  }

  const { id } = req.params;
  const success = await AISystemService.delete(id, organizationId);
  if (!success) {
    return sendError(res, 404, 'AI System not found or not deleted');
  }

  return sendSuccess(res, { success: true });
});

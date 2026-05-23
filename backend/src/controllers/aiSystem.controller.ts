import { Response } from 'express';
import { AISystemService } from '../services/aiSystem.service';
import { resolveOrganizationId } from '../utils/company';
import { asyncHandler, sendSuccess, sendError } from '../utils/controllerHelpers';
import { ChangeHistoryService } from '../services/changeHistory.service';

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

  await ChangeHistoryService.logChange(
    organizationId,
    'agent',
    item.id,
    req.user.id,
    'created',
    null,
    item,
    'AI System registered'
  );

  return sendSuccess(res, item, 201);
});

export const updateAISystem = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) {
    return sendError(res, 400, 'Company context required');
  }

  const { id } = req.params;
  const existing = await AISystemService.get(id, organizationId);
  const item = await AISystemService.update(id, organizationId, req.body);
  if (!item) {
    return sendError(res, 404, 'AI System not found or not updated');
  }

  await ChangeHistoryService.logChange(
    organizationId,
    'agent',
    id,
    req.user.id,
    'updated',
    existing,
    item,
    'AI System updated'
  );

  return sendSuccess(res, item);
});

export const deleteAISystem = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) {
    return sendError(res, 400, 'Company context required');
  }

  const { id } = req.params;
  const existing = await AISystemService.get(id, organizationId);
  const success = await AISystemService.delete(id, organizationId);
  if (!success) {
    return sendError(res, 404, 'AI System not found or not deleted');
  }

  await ChangeHistoryService.logChange(
    organizationId,
    'agent',
    id,
    req.user.id,
    'deleted',
    existing,
    null,
    'AI System deleted'
  );

  return sendSuccess(res, { success: true });
});

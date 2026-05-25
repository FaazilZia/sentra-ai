import { Response } from 'express';
import { AutomationService } from '../services/automation.service';
import { getOrgId, asyncHandler, sendSuccess, sendError } from '../utils/controllerHelpers';

export const listAutomations = asyncHandler(async (req: any, res: Response) => {
  const orgId = getOrgId(req);
  const list = await AutomationService.listAutomations(orgId);
  return sendSuccess(res, list);
});

export const createAutomation = asyncHandler(async (req: any, res: Response) => {
  const orgId = getOrgId(req);
  const data = req.body;
  const created = await AutomationService.createAutomation(orgId, data);
  return sendSuccess(res, created, 201, 'Automation created successfully');
});

export const updateAutomation = asyncHandler(async (req: any, res: Response) => {
  const orgId = getOrgId(req);
  const { id } = req.params;
  const data = req.body;
  const updated = await AutomationService.updateAutomation(orgId, id, data);
  return sendSuccess(res, updated, 200, 'Automation updated successfully');
});

export const deleteAutomation = asyncHandler(async (req: any, res: Response) => {
  const orgId = getOrgId(req);
  const { id } = req.params;
  await AutomationService.deleteAutomation(orgId, id);
  return sendSuccess(res, null, 200, 'Automation deleted successfully');
});

export const toggleAutomation = asyncHandler(async (req: any, res: Response) => {
  const orgId = getOrgId(req);
  const { id } = req.params;
  const { is_active } = req.body;

  if (is_active === undefined) {
    return sendError(res, 400, 'Active state boolean parameter required');
  }

  const toggled = await AutomationService.toggleAutomation(orgId, id, is_active);
  return sendSuccess(res, toggled, 200, `Automation ${is_active ? 'enabled' : 'disabled'} successfully`);
});

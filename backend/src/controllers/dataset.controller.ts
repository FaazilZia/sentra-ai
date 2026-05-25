import { Response } from 'express';
import { DatasetService } from '../services/dataset.service';
import { getOrgId, asyncHandler, sendSuccess, sendError } from '../utils/controllerHelpers';

export const listDatasets = asyncHandler(async (req: any, res: Response) => {
  const orgId = getOrgId(req);
  const datasets = await DatasetService.listDatasets(orgId);
  return sendSuccess(res, datasets);
});

export const createDataset = asyncHandler(async (req: any, res: Response) => {
  const orgId = getOrgId(req);
  const data = req.body;
  const newDataset = await DatasetService.createDataset(orgId, {
    ...data,
    created_by: req.user?.email || 'user'
  });
  return sendSuccess(res, newDataset, 201, 'Dataset created successfully');
});

export const updateDataset = asyncHandler(async (req: any, res: Response) => {
  const orgId = getOrgId(req);
  const { id } = req.params;
  const data = req.body;
  const updated = await DatasetService.updateDataset(orgId, id, data);
  return sendSuccess(res, updated, 200, 'Dataset updated successfully');
});

export const deleteDataset = asyncHandler(async (req: any, res: Response) => {
  const orgId = getOrgId(req);
  const { id } = req.params;
  await DatasetService.deleteDataset(orgId, id);
  return sendSuccess(res, null, 200, 'Dataset deleted successfully');
});

export const archiveDataset = asyncHandler(async (req: any, res: Response) => {
  const orgId = getOrgId(req);
  const { id } = req.params;
  const archived = await DatasetService.archiveDataset(orgId, id);
  return sendSuccess(res, archived, 200, 'Dataset archived successfully');
});

export const linkToSystem = asyncHandler(async (req: any, res: Response) => {
  const orgId = getOrgId(req);
  const { id } = req.params;
  const { aiSystemId } = req.body;
  if (!aiSystemId) {
    return sendError(res, 400, 'AI System ID required');
  }
  const linked = await DatasetService.linkToSystem(orgId, id, aiSystemId);
  return sendSuccess(res, linked, 200, 'Dataset linked to system successfully');
});

import { Response } from 'express';
import { ChangeHistoryService } from '../services/changeHistory.service';
import { resolveOrganizationId } from '../utils/company';
import { asyncHandler, sendSuccess, sendError } from '../utils/controllerHelpers';
import { ChangeEntityType } from '@prisma/client';

export const getEntityHistory = asyncHandler(async (req: any, res: Response) => {
  const orgId = await resolveOrganizationId(req);
  if (!orgId) return sendError(res, 401, 'Unauthorized');

  const { entityType, entityId } = req.params;
  
  // Validate entityType enum
  const validEntityTypes: string[] = ['policy', 'risk', 'incident', 'guardrail', 'agent', 'compliance', 'workflow'];
  if (!validEntityTypes.includes(entityType)) {
    return sendError(res, 400, `Invalid entity type: ${entityType}`);
  }

  const history = await ChangeHistoryService.getChangeHistory(
    entityType as ChangeEntityType,
    entityId,
    orgId
  );
  return sendSuccess(res, history);
});

export const getRecentHistory = asyncHandler(async (req: any, res: Response) => {
  const orgId = await resolveOrganizationId(req);
  if (!orgId) return sendError(res, 401, 'Unauthorized');

  const limitParam = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 10;
  const limit = Number.isNaN(limitParam) ? 10 : limitParam;

  const history = await ChangeHistoryService.getRecentChanges(orgId, limit);
  return sendSuccess(res, history);
});

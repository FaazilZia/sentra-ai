import { Response } from 'express';
import { SearchService } from '../services/search.service';
import { resolveOrganizationId } from '../utils/company';
import { asyncHandler, sendSuccess, sendError } from '../utils/controllerHelpers';

export const executeGlobalSearch = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');

  const { q } = req.query;
  const limitQuery = req.query.limit;
  
  if (!q || typeof q !== 'string' || q.trim().length < 2) {
    return sendSuccess(res, [], 200);
  }

  const limit = limitQuery ? Number.parseInt(String(limitQuery), 10) : 20;

  const results = await SearchService.search(organizationId, q, limit);
  return sendSuccess(res, results, 200);
});

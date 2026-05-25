import { Response } from 'express';
import { FrameworkMapperService } from '../services/frameworkMapper.service';
import { getOrgId, asyncHandler, sendSuccess, sendError } from '../utils/controllerHelpers';

export const getOverview = asyncHandler(async (req: any, res: Response) => {
  const orgId = getOrgId(req);
  const map = await FrameworkMapperService.getCrossFrameworkMap(orgId);
  return sendSuccess(res, map);
});

export const getGaps = asyncHandler(async (req: any, res: Response) => {
  const orgId = getOrgId(req);
  const gaps = await FrameworkMapperService.getGapAnalysis(orgId);
  return sendSuccess(res, gaps);
});

export const getOverlapScore = asyncHandler(async (req: any, res: Response) => {
  const orgId = getOrgId(req);
  const score = await FrameworkMapperService.getOverlapScore(orgId);
  return sendSuccess(res, score);
});

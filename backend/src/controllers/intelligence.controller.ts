import { Response } from 'express';
import { IntelligenceService } from '../services/intelligence.service';
import { asyncHandler, sendSuccess, sendError } from '../utils/controllerHelpers';

export class IntelligenceController {
  static getExecutiveMetrics = asyncHandler(async (req: any, res: Response) => {
    const organizationId = req.user?.organizationId || req.query.organizationId as string;
    if (!organizationId) {
      return sendError(res, 400, 'Organization ID is required');
    }

    const metrics = await IntelligenceService.getExecutiveMetrics(organizationId);
    return sendSuccess(res, metrics);
  });

  static getTopAttackPatterns = asyncHandler(async (req: any, res: Response) => {
    const organizationId = req.user?.organizationId || req.query.organizationId as string;
    if (!organizationId) {
      return sendError(res, 400, 'Organization ID is required');
    }

    const patterns = await IntelligenceService.getTopAttackPatterns(organizationId);
    return sendSuccess(res, patterns);
  });

  static getRiskTrend = asyncHandler(async (req: any, res: Response) => {
    const organizationId = req.user?.organizationId || req.query.organizationId as string;
    const days = Number.parseInt(req.query.days as string, 10) || 7;

    if (!organizationId) {
      return sendError(res, 400, 'Organization ID is required');
    }

    const trend = await IntelligenceService.getRiskTrend(organizationId, days);
    return sendSuccess(res, trend);
  });
}


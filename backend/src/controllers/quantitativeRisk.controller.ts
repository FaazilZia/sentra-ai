import { Response } from 'express';
import { QuantitativeRiskService } from '../services/quantitativeRisk.service';
import { resolveOrganizationId } from '../utils/company';
import { asyncHandler, sendSuccess, sendError } from '../utils/controllerHelpers';

export const getRiskPortfolio = asyncHandler(async (req: any, res: Response) => {
  const orgId = await resolveOrganizationId(req);
  if (!orgId) return sendError(res, 401, 'Unauthorized');

  const portfolio = await QuantitativeRiskService.getOrgRiskPortfolio(orgId);
  return sendSuccess(res, portfolio);
});

export const getAgentRiskScore = asyncHandler(async (req: any, res: Response) => {
  const orgId = await resolveOrganizationId(req);
  if (!orgId) return sendError(res, 401, 'Unauthorized');

  const { agentId } = req.params;
  if (!agentId) return sendError(res, 400, 'Agent ID is required');

  const score = await QuantitativeRiskService.getAgentRiskScore(agentId, orgId);
  return sendSuccess(res, score);
});

export const updateAgentRiskScore = asyncHandler(async (req: any, res: Response) => {
  const orgId = await resolveOrganizationId(req);
  if (!orgId) return sendError(res, 401, 'Unauthorized');

  const { agentId } = req.params;
  const { likelihood, impact, methodology } = req.body;

  if (!agentId) return sendError(res, 400, 'Agent ID is required');
  if (likelihood === undefined || impact === undefined) {
    return sendError(res, 400, 'Likelihood and impact scores are required');
  }

  const result = await QuantitativeRiskService.updateRiskScore(
    orgId,
    agentId,
    Number(likelihood),
    Number(impact),
    methodology || 'Manual override update',
    'manual'
  );

  return sendSuccess(res, result);
});

export const getRiskTrend = asyncHandler(async (req: any, res: Response) => {
  const orgId = await resolveOrganizationId(req);
  if (!orgId) return sendError(res, 401, 'Unauthorized');

  const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;
  const trend = await QuantitativeRiskService.getRiskTrend(orgId, days);
  return sendSuccess(res, trend);
});

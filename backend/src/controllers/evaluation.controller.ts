import { Response } from 'express';
import { EvaluationService } from '../services/evaluation.service';
import { parsePagination } from '../utils/pagination';
import { asyncHandler, sendSuccess, sendError, getOrgId } from '../utils/controllerHelpers';

export const triggerEvaluation = asyncHandler(async (req: any, res: Response) => {
  const { agentId, datasetId, runType } = req.body;
  const organizationId = getOrgId(req);
  const runId = await EvaluationService.runEvaluation({
    organizationId,
    agentId,
    datasetId,
    runType: runType || 'MANUAL',
    triggeredBy: req.user.id,
  });
  return res.status(202).json({ status: "queued", runId });
});

export const listRuns = asyncHandler(async (req: any, res: Response) => {
  const { page, limit } = parsePagination(req.query, 20, 200);
  const organizationId = getOrgId(req);
  const result = await EvaluationService.getRuns(organizationId, page, limit);
  return sendSuccess(res, result);
});

export const getRunResults = asyncHandler(async (req: any, res: Response) => {
  const organizationId = getOrgId(req);
  try {
    const run = await EvaluationService.getRunResults(req.params.id, organizationId);
    return sendSuccess(res, run);
  } catch (e: any) {
    if (e.message?.includes('not found')) return sendError(res, 404, e.message);
    throw e;
  }
});

export const getGovernanceScore = asyncHandler(async (req: any, res: Response) => {
  const organizationId = getOrgId(req);
  const score = await EvaluationService.getGovernanceScore(organizationId);
  return sendSuccess(res, score);
});

export const listDatasets = asyncHandler(async (req: any, res: Response) => {
  const organizationId = getOrgId(req);
  const datasets = await EvaluationService.listDatasets(organizationId);
  return sendSuccess(res, datasets);
});

export const createDataset = asyncHandler(async (req: any, res: Response) => {
  const { name, description, category, test_cases } = req.body;
  if (!name || !category || !Array.isArray(test_cases)) {
    return sendError(res, 400, 'name, category, and test_cases are required');
  }
  const organizationId = getOrgId(req);
  const dataset = await EvaluationService.createDataset(organizationId, { name, description, category, test_cases });
  return sendSuccess(res, dataset, 201);
});

export const scorePrompt = asyncHandler(async (req: any, res: Response) => {
  const { prompt } = req.body;
  if (!prompt) return sendError(res, 400, 'prompt is required');
  const result = EvaluationService.scorePromptSafety(prompt);
  return sendSuccess(res, result);
});

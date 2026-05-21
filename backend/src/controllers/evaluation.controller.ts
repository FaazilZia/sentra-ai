import { Response, NextFunction } from 'express';
import { EvaluationService } from '../services/evaluation.service';
import { parsePagination } from '../utils/pagination';

export const triggerEvaluation = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { agentId, datasetId, runType } = req.body;
    const runId = await EvaluationService.runEvaluation({
      organizationId: req.user.organizationId,
      agentId,
      datasetId,
      runType: runType || 'MANUAL',
      triggeredBy: req.user.id,
    });
    res.status(202).json({ success: true, message: 'Evaluation started', data: { runId } });
  } catch (e) { next(e); }
};

export const listRuns = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = parsePagination(req.query, 20, 200);
    const result = await EvaluationService.getRuns(req.user.organizationId, page, limit);
    res.json({ success: true, ...result });
  } catch (e) { next(e); }
};

export const getRunResults = async (req: any, res: Response, next: NextFunction) => {
  try {
    const run = await EvaluationService.getRunResults(req.params.id, req.user.organizationId);
    res.json({ success: true, data: run });
  } catch (e: any) {
    if (e.message?.includes('not found')) return res.status(404).json({ success: false, message: e.message });
    next(e);
  }
};

export const getGovernanceScore = async (req: any, res: Response, next: NextFunction) => {
  try {
    const score = await EvaluationService.getGovernanceScore(req.user.organizationId);
    res.json({ success: true, data: score });
  } catch (e) { next(e); }
};

export const listDatasets = async (req: any, res: Response, next: NextFunction) => {
  try {
    const datasets = await EvaluationService.listDatasets(req.user.organizationId);
    res.json({ success: true, data: datasets });
  } catch (e) { next(e); }
};

export const createDataset = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { name, description, category, test_cases } = req.body;
    if (!name || !category || !Array.isArray(test_cases)) {
      return res.status(400).json({ success: false, message: 'name, category, and test_cases are required' });
    }
    const dataset = await EvaluationService.createDataset(req.user.organizationId, { name, description, category, test_cases });
    res.status(201).json({ success: true, data: dataset });
  } catch (e) { next(e); }
};

export const scorePrompt = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ success: false, message: 'prompt is required' });
    const result = EvaluationService.scorePromptSafety(prompt);
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
};

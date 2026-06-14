import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requirePermission } from '../services/rbac.service';
import {
  triggerEvaluation, listRuns, getRunResults,
  getGovernanceScore, listDatasets, createDataset, scorePrompt,
  getBiasPresets, runBiasAudit
} from '../controllers/evaluation.controller';
import { EvaluationService } from '../services/evaluation.service';
import prisma from '../config/db';
import logger from '../utils/logger';

const router = Router();

router.use(authenticate, requireTenant);

// ── Governance Score ──────────────────────────
router.get('/score', requirePermission('evaluation', 'read'), getGovernanceScore);

// ── Evaluation Runs ───────────────────────────
router.get('/runs', requirePermission('evaluation', 'read'), listRuns);
router.post('/runs', requirePermission('evaluation', 'run'), triggerEvaluation);
router.get('/runs/:id', requirePermission('evaluation', 'read'), getRunResults);

// ── Datasets ──────────────────────────────────
router.get('/datasets', requirePermission('evaluation', 'read'), listDatasets);
router.post('/datasets', requirePermission('evaluation', 'create'), createDataset);

// ── Real-time Prompt Scoring ──────────────────
router.post('/score-prompt', requirePermission('evaluation', 'read'), scorePrompt);

// ── Bias Auditing & Live Runs (merged from evaluations.routes.ts) ──
router.get('/bias-presets', requirePermission('evaluation', 'read'), getBiasPresets);
router.post('/run-bias-audit', requirePermission('evaluation', 'run'), runBiasAudit);
router.post('/run', requirePermission('evaluation', 'run'), triggerEvaluation);
router.post('/live-run', requirePermission('evaluation', 'run'), async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { model, datasetCategory, apiKey } = req.body;
    
    const run = await prisma.evaluation_runs.create({
      data: {
        organizationId,
        run_type: 'LIVE_EVAL',
        status: 'running',
        started_at: new Date(),
        governance_score: 0,
      },
    });
    
    EvaluationService.runLiveModelEvaluation(organizationId, run.id, model, datasetCategory, apiKey)
      .catch(err => logger.error('[EvalService] Live eval failed:', err));
    
    res.json({ success: true, data: { runId: run.id, message: 'Evaluation started' } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
router.get('/:id/results', requirePermission('evaluation', 'read'), getRunResults);

export default router;

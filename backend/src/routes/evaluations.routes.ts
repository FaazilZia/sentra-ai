import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requirePermission } from '../services/rbac.service';
import { triggerEvaluation, getRunResults, getBiasPresets, runBiasAudit } from '../controllers/evaluation.controller';
import { EvaluationService } from '../services/evaluation.service';
import prisma from '../config/db';
import logger from '../utils/logger';

const router = Router();

router.use(authenticate, requireTenant);

/**
 * GET /api/v1/evaluations/bias-presets
 * Returns available bias audit presets.
 */
router.get('/bias-presets', requirePermission('evaluation', 'read'), getBiasPresets);

/**
 * POST /api/v1/evaluations/run-bias-audit
 * Runs the requested bias audit preset through the decision engine.
 */
router.post('/run-bias-audit', requirePermission('evaluation', 'run'), runBiasAudit);

/**
 * POST /api/v1/evaluations/run
 * Enqueues a benchmark evaluation run in BullMQ and returns the runId immediately.
 */
router.post('/run', requirePermission('evaluation', 'run'), triggerEvaluation);

/**
 * POST /api/v1/evaluations/live-run
 * Trigger a live OpenAI evaluation run.
 */
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

/**
 * GET /api/v1/evaluations/runs/:id
 * Returns the status, overall stats, and detailed results of a specific evaluation run.
 */
router.get('/runs/:id', requirePermission('evaluation', 'read'), getRunResults);

/**
 * GET /api/v1/evaluations/:id/results
 * Returns the status, overall stats, and detailed results of a specific evaluation run.
 */
router.get('/:id/results', requirePermission('evaluation', 'read'), getRunResults);

export default router;


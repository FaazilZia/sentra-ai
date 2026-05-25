import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requirePermission } from '../services/rbac.service';
import { triggerEvaluation, getRunResults, getBiasPresets, runBiasAudit } from '../controllers/evaluation.controller';

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
 * GET /api/v1/evaluations/:id/results
 * Returns the status, overall stats, and detailed results of a specific evaluation run.
 */
router.get('/:id/results', requirePermission('evaluation', 'read'), getRunResults);

export default router;

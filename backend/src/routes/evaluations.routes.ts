import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requirePermission } from '../services/rbac.service';
import { triggerEvaluation, getRunResults } from '../controllers/evaluation.controller';

const router = Router();

router.use(authenticate, requireTenant);

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

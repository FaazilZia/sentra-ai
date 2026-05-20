import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requirePermission } from '../services/rbac.service';
import {
  triggerEvaluation, listRuns, getRunResults,
  getGovernanceScore, listDatasets, createDataset, scorePrompt,
} from '../controllers/evaluation.controller';

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

export default router;

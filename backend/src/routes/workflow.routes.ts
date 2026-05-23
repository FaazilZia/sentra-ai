import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requirePermission } from '../services/rbac.service';
import {
  createTask, listTasks, getTask,
  submitForReview, approveTask, rejectTask,
  assignTask, getTaskHistory,
  listPendingWorkflows, resolveWorkflow
} from '../controllers/workflow.controller';

const router = Router();

router.use(authenticate, requireTenant);

// ── Governance Human Oversight ────────────────
router.get('/pending', requirePermission('compliance', 'read'), listPendingWorkflows);
router.post('/:id/resolve', requirePermission('compliance', 'update'), resolveWorkflow);

// ── Task CRUD ─────────────────────────────────
router.get('/', requirePermission('compliance', 'read'), listTasks);
router.post('/', requirePermission('compliance', 'update'), createTask);
router.get('/:id', requirePermission('compliance', 'read'), getTask);

// ── Workflow Transitions ──────────────────────
router.post('/:id/submit', requirePermission('compliance', 'update'), submitForReview);
router.post('/:id/approve', requirePermission('compliance', 'update'), approveTask);
router.post('/:id/reject', requirePermission('compliance', 'update'), rejectTask);
router.patch('/:id/assign', requirePermission('compliance', 'update'), assignTask);

// ── History ───────────────────────────────────
router.get('/:id/history', requirePermission('compliance', 'read'), getTaskHistory);

export default router;


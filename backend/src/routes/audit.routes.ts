import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requirePermission, requireRole } from '../services/rbac.service';
import {
  getAuditLogs, exportAuditLogs, verifyAuditChain, getAuditStats,
} from '../controllers/audit.controller';

const router = Router();

router.use(authenticate, requireTenant);

// ── Audit Log Explorer ────────────────────────
router.get('/', requirePermission('audit', 'read'), getAuditLogs);
router.get('/stats', requirePermission('audit', 'read'), getAuditStats);
router.get('/export', requirePermission('audit', 'export'), exportAuditLogs);
router.get('/verify', requirePermission('audit', 'read'), verifyAuditChain);

export default router;

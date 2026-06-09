import { Router } from 'express';
import { createAlertRule, getAlertRules } from '../controllers/alert.controller';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';

const router = Router();

// MVP Alert rules (Admin only)
router.post('/rules', authenticate, authorizeRoles('ADMIN'), createAlertRule);
router.get('/rules', authenticate, authorizeRoles('ADMIN', 'AUDITOR'), getAlertRules);

export default router;

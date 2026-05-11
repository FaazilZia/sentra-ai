import { Router } from 'express';
import { createAlertRule, getAlertRules } from '../controllers/alert.controller';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createAlertRuleSchema } from '../validations/alert.validation';

const router = Router();

// MVP Alert rules (Admin only)
router.post('/rules', authenticate, authorizeRoles('ADMIN'), validate(createAlertRuleSchema), createAlertRule);
router.get('/rules', authenticate, authorizeRoles('ADMIN', 'AUDITOR'), getAlertRules);

export default router;

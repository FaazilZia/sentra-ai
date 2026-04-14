import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getPolicies, getPolicyHealth } from '../controllers/policy.controller';

const router = Router();

router.get('/', authenticate, getPolicies);
router.get('/health', authenticate, getPolicyHealth);

export default router;

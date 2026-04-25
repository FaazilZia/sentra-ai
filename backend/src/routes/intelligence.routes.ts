import { Router } from 'express';
import { IntelligenceController } from '../controllers/intelligence.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Secure intelligence routes
router.use(authenticate);

router.get('/metrics', IntelligenceController.getExecutiveMetrics);
router.get('/patterns', IntelligenceController.getTopAttackPatterns);
router.get('/trend', IntelligenceController.getRiskTrend);

export default router;

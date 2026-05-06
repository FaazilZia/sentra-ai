import { Router } from 'express';
import { IntelligenceController } from '../controllers/intelligence.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/metrics', authenticate, IntelligenceController.getExecutiveMetrics);
router.get('/patterns', authenticate, IntelligenceController.getTopAttackPatterns);
router.get('/trend', authenticate, IntelligenceController.getRiskTrend);

export default router;

import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getRiskAssessment } from '../controllers/risk.controller';

const router = Router();

router.get('/', authenticate, getRiskAssessment);

export default router;

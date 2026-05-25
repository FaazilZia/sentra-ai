import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getOverview, getGaps, getOverlapScore } from '../controllers/frameworkMapper.controller';

const router = Router();

router.get('/overview', authenticate, getOverview);
router.get('/gaps', authenticate, getGaps);
router.get('/overlap-score', authenticate, getOverlapScore);

export default router;

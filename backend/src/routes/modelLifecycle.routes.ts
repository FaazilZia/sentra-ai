import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getStageInfo, transitionStage } from '../controllers/modelLifecycle.controller';

const router = Router();

router.get('/:aiSystemId', authenticate, getStageInfo);
router.post('/:aiSystemId/transition', authenticate, transitionStage);

export default router;

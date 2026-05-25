import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getStageInfo, transitionStage } from '../controllers/modelLifecycle.controller';
import { ModelLifecycleService } from '../services/modelLifecycle.service';
import { getOrgId, sendSuccess } from '../utils/controllerHelpers';

const router = Router();

// Handle exact path specified in prompt: POST /api/v1/model-lifecycle/transition
router.post('/transition', authenticate, async (req: any, res: any) => {
  const orgId = getOrgId(req);
  const { aiSystemId, newStage, notes } = req.body;
  try {
    const outcome = await ModelLifecycleService.transitionStage(
      aiSystemId,
      orgId,
      newStage,
      notes || null,
      req.user?.email || 'user'
    );
    return sendSuccess(res, outcome, 200, `Model advanced to ${newStage} successfully`);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Transition denied' });
  }
});

// Handle exact path specified in prompt: GET /api/v1/model-lifecycle/:aiSystemId/history
router.get('/:aiSystemId/history', authenticate, async (req: any, res: any) => {
  const orgId = getOrgId(req);
  const { aiSystemId } = req.params;
  const history = await ModelLifecycleService.getLifecycleHistory(aiSystemId, orgId);
  return sendSuccess(res, history);
});

router.get('/:aiSystemId', authenticate, getStageInfo);
router.post('/:aiSystemId/transition', authenticate, transitionStage);

export default router;

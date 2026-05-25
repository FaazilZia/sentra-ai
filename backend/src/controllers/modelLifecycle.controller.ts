import { Response } from 'express';
import { ModelLifecycleService } from '../services/modelLifecycle.service';
import { getOrgId, asyncHandler, sendSuccess, sendError } from '../utils/controllerHelpers';

export const getStageInfo = asyncHandler(async (req: any, res: Response) => {
  const orgId = getOrgId(req);
  const { aiSystemId } = req.params;
  const currentStage = await ModelLifecycleService.getCurrentStage(aiSystemId, orgId);
  const history = await ModelLifecycleService.getLifecycleHistory(aiSystemId, orgId);
  return sendSuccess(res, { currentStage, history });
});

export const transitionStage = asyncHandler(async (req: any, res: Response) => {
  const orgId = getOrgId(req);
  const { aiSystemId } = req.params;
  const { newStage, notes } = req.body;

  if (!newStage) {
    return sendError(res, 400, 'Destination lifecycle stage required');
  }

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
    return sendError(res, 400, err.message || 'Transition denied');
  }
});

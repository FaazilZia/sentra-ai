import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  listCeMarkingRecords,
  getOrCreateCeMarking,
  updateCeMarkingStep,
  updateCeMarkingClassification,
} from '../controllers/ceMarking.controller';

const router = Router();
router.use(authenticate);
router.get('/', listCeMarkingRecords);
router.get('/:aiSystemId', getOrCreateCeMarking);
router.patch('/:aiSystemId/step', updateCeMarkingStep);
router.patch('/:aiSystemId/classification', updateCeMarkingClassification);

export default router;

import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  createAssessment,
  getAssessment,
  listAssessments,
  saveResponses,
  completeAssessment,
  getComplianceStatus
} from '../controllers/fria.controller';

const router = Router();

router.use(authenticate);

router.post('/assessments', createAssessment);
router.get('/assessments', listAssessments);
router.get('/assessments/:id', getAssessment);
router.patch('/assessments/:id/responses', saveResponses);
router.post('/assessments/:id/complete', completeAssessment);
router.get('/compliance/:aiSystemId', getComplianceStatus);

export default router;

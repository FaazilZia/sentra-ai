import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getGdprControls,
  getGdprControlById,
  updateGdprControl,
  getReadiness
} from '../controllers/complianceCRUD.controller';

const router = Router();

router.get('/gdpr/controls', authenticate, getGdprControls);
router.get('/gdpr/controls/:id', authenticate, getGdprControlById);
router.patch('/gdpr/controls/:id', authenticate, updateGdprControl);
router.get('/readiness', authenticate, getReadiness);

export default router;

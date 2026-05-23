import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getEntityHistory,
  getRecentHistory
} from '../controllers/changeHistory.controller';

const router = Router();

router.get('/recent', authenticate, getRecentHistory);
router.get('/:entityType/:entityId', authenticate, getEntityHistory);

export default router;

import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getDashboard,
  generateReport,
  scheduleCheck
} from '../controllers/postMarketMonitoring.controller';

const router = Router();

router.use(authenticate);

router.get('/dashboard', getDashboard);
router.get('/report', generateReport);
router.post('/schedule', scheduleCheck);

export default router;

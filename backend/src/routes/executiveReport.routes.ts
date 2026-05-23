import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getExecutiveStats, getExecutivePdf } from '../controllers/executiveReport.controller';

const router = Router();

router.get('/', authenticate, getExecutiveStats);
router.get('/pdf', authenticate, getExecutivePdf);

export default router;

import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { simulateIntercept } from '../controllers/intercept.controller';

const router = Router();

router.post('/simulate', authenticate, simulateIntercept);

export default router;

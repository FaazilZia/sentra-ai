import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getLogs } from '../controllers/intercept.controller';

const router = Router();

router.get('/', authenticate, getLogs);

export default router;

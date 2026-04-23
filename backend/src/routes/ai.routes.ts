import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { aiChatSchema } from '../validations/ai.validation';
import { postChat, postCheckAction, getLogs, postReplayAction, getSecurityScore, postOverrideAction, getDashboardStats } from '../controllers/ai.controller';

const router = Router();

router.post('/chat', authenticate, validate(aiChatSchema), postChat);
router.post('/check-action', authenticate, postCheckAction);
router.post('/replay', authenticate, postReplayAction);
router.get('/logs', authenticate, getLogs);
router.get('/dashboard-stats', authenticate, getDashboardStats);
router.get('/security-score', authenticate, getSecurityScore);
router.post('/override/:id', authenticate, postOverrideAction);

export default router;

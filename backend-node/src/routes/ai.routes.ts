import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { aiChatSchema } from '../validations/ai.validation';
import { postChat, postCheckAction, getLogs, postReplayAction, getSecurityScore } from '../controllers/ai.controller';

const router = Router();

router.post('/chat', authenticate, validate(aiChatSchema), postChat);
router.post('/check-action', authenticate, postCheckAction);
router.post('/replay', authenticate, postReplayAction);
router.get('/logs', authenticate, getLogs);
router.get('/security-score', authenticate, getSecurityScore);

export default router;

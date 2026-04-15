import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { aiChatSchema } from '../validations/ai.validation';
import { postChat, postCheckAction, getLogs } from '../controllers/ai.controller';

const router = Router();

router.post('/chat', authenticate, validate(aiChatSchema), postChat);
router.post('/check-action', authenticate, postCheckAction);
router.get('/logs', authenticate, getLogs);

export default router;

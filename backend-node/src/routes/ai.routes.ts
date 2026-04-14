import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { aiChatSchema } from '../validations/ai.validation';
import { postChat } from '../controllers/ai.controller';

const router = Router();

router.post('/chat', authenticate, validate(aiChatSchema), postChat);

export default router;

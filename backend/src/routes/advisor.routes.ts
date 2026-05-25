import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { chatWithAdvisor, getAdvisorSuggestions } from '../controllers/advisor.controller';

const router = Router();

router.post('/chat', authenticate, chatWithAdvisor);
router.get('/suggestions', authenticate, getAdvisorSuggestions);

export default router;

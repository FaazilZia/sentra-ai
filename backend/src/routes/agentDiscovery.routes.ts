import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { scanAgents, getAgents } from '../controllers/agentDiscovery.controller';

const router = Router();

router.post('/scan', authenticate, scanAgents);
router.get('/', authenticate, getAgents);

export default router;

import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { scanAgents, getAgents } from '../controllers/agentDiscovery.controller';
import { AgentPostureController } from '../controllers/agentPosture.controller';

const router = Router();

router.post('/scan', authenticate, scanAgents);
router.get('/', authenticate, getAgents);

// Agent Config Posture Scanning routes
router.post('/posture-scan-all', authenticate, AgentPostureController.scanAllAgentsPosture);
router.post('/:id/posture-scan', authenticate, AgentPostureController.scanAgentPosture);
router.get('/:id/posture-findings', authenticate, AgentPostureController.getAgentPostureFindings);

export default router;

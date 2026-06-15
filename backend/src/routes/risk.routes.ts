import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getRiskAssessment,
  getRiskPortfolio,
  getRiskTrend,
  getAgentRiskScore,
  updateAgentRiskScore
} from '../controllers/risk.controller';

const router = Router();

router.get('/', authenticate, getRiskAssessment);
router.get('/portfolio', authenticate, getRiskPortfolio);
router.get('/trend', authenticate, getRiskTrend);
router.get('/agent/:agentId/score', authenticate, getAgentRiskScore);
router.put('/agent/:agentId/score', authenticate, updateAgentRiskScore);

export default router;

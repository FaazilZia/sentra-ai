import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getRiskAssessment } from '../controllers/risk.controller';
import {
  getRiskPortfolio,
  getAgentRiskScore,
  updateAgentRiskScore,
  getRiskTrend
} from '../controllers/quantitativeRisk.controller';

const router = Router();

router.get('/', authenticate, getRiskAssessment);
router.get('/portfolio', authenticate, getRiskPortfolio);
router.get('/agent/:agentId/score', authenticate, getAgentRiskScore);
router.put('/agent/:agentId/score', authenticate, updateAgentRiskScore);
router.get('/trend', authenticate, getRiskTrend);

export default router;

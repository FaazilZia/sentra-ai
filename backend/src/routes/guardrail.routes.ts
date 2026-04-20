import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';
import { 
  processAIRequest, 
  getGuardrailLogs, 
  postRequestOverride, 
  postApproveOverride, 
  getOverrides, 
  getMetrics 
} from '../controllers/guardrail.controller';

const router = Router();

// End-user AI Proxy
router.post('/proxy', authenticate, processAIRequest);

// Admin Monitor & Overrides
router.get('/logs', authenticate, authorizeRoles('ADMIN', 'AUDITOR'), getGuardrailLogs);
router.get('/metrics', authenticate, authorizeRoles('ADMIN', 'AUDITOR'), getMetrics);
router.get('/overrides', authenticate, authorizeRoles('ADMIN', 'AUDITOR'), getOverrides);
router.post('/override/request', authenticate, postRequestOverride);
router.post('/override/approve', authenticate, authorizeRoles('ADMIN'), postApproveOverride);

export default router;

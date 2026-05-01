import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';
import { 
  processAIRequest, 
  processDemoRequest,
  getGuardrailLogs, 
  exportGuardrailLogs,
  postRequestOverride, 
  postApproveOverride, 
  getOverrides, 
  getMetrics 
} from '../controllers/guardrail.controller';

const router = Router();

// End-user AI Proxy
router.post('/proxy', authenticate, processAIRequest);

// Unauthenticated Demo Mode
import rateLimit from 'express-rate-limit';
const demoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: { success: false, message: 'Too many demo requests. Please sign up to continue testing.' }
});
router.post('/demo', demoLimiter, processDemoRequest);

// Admin Monitor & Overrides
router.get('/logs', authenticate, authorizeRoles('ADMIN', 'AUDITOR'), getGuardrailLogs);
router.get('/logs/export', authenticate, authorizeRoles('ADMIN', 'AUDITOR'), exportGuardrailLogs);
router.get('/metrics', authenticate, authorizeRoles('ADMIN', 'AUDITOR'), getMetrics);
router.get('/overrides', authenticate, authorizeRoles('ADMIN', 'AUDITOR'), getOverrides);
router.post('/override/request', authenticate, postRequestOverride);
router.post('/override/approve', authenticate, authorizeRoles('ADMIN'), postApproveOverride);

export default router;

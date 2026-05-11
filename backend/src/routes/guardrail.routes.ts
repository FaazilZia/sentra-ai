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
  getMetrics,
  checkAction
} from '../controllers/guardrail.controller';

import { validate } from '../middleware/validate.middleware';
import { processAIRequestSchema, checkActionSchema, processDemoRequestSchema, postRequestOverrideSchema, postApproveOverrideSchema } from '../validations/guardrail.validation';

const router = Router();

// End-user AI Proxy
router.post('/proxy', authenticate, validate(processAIRequestSchema), processAIRequest);
router.post('/action', authenticate, validate(checkActionSchema), checkAction);

// Unauthenticated Demo Mode
import rateLimit from 'express-rate-limit';
const demoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: { success: false, message: 'Too many demo requests. Please sign up to continue testing.' }
});
router.post('/demo', demoLimiter, validate(processDemoRequestSchema), processDemoRequest);

// Admin Monitor & Overrides
router.get('/logs', authenticate, authorizeRoles('ADMIN', 'AUDITOR'), getGuardrailLogs);
router.get('/logs/export', authenticate, authorizeRoles('ADMIN', 'AUDITOR'), exportGuardrailLogs);
router.get('/metrics', authenticate, authorizeRoles('ADMIN', 'AUDITOR'), getMetrics);
router.get('/overrides', authenticate, authorizeRoles('ADMIN', 'AUDITOR'), getOverrides);
router.post('/override/request', authenticate, validate(postRequestOverrideSchema), postRequestOverride);
router.post('/override/approve', authenticate, authorizeRoles('ADMIN'), validate(postApproveOverrideSchema), postApproveOverride);


export default router;

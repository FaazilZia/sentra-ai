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
import {
  createGuardrail,
  getGuardrails,
  getGuardrailById,
  updateGuardrail,
  deleteGuardrail
} from '../controllers/guardrailCRUD.controller';

const router = Router();

// End-user AI Proxy
/**
 * @openapi
 * /guardrails/proxy:
 *   post:
 *     tags: [Guardrails]
 *     summary: Route an AI prompt through the guardrail engine
 *     description: Inspects the prompt against guardrail rules (PII, injection, policy violations) and allows, flags, or blocks the request.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [prompt]
 *             properties:
 *               prompt: { type: string }
 *               context: { type: object }
 *     responses:
 *       200:
 *         description: Guardrail decision
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 allowed: { type: boolean }
 *                 blocked: { type: boolean }
 *                 reason: { type: string }
 *       401: { description: Not authenticated }
 */
router.post('/proxy', authenticate, processAIRequest);
router.post('/action', authenticate, checkAction);


// Unauthenticated Demo Mode (Protected by distributed per-IP rate limiter)
import { demoRateLimiter } from '../config/rateLimit';
router.post('/demo', demoRateLimiter, processDemoRequest);


/**
 * @openapi
 * /guardrails/metrics:
 *   get:
 *     tags: [Guardrails]
 *     summary: Get guardrail metrics (admin/auditor only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Guardrail metrics summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalRequests: { type: integer }
 *                 blocked: { type: integer }
 *                 flagged: { type: integer }
 *                 allowed: { type: integer }
 *       403: { description: Insufficient permissions }
 * /guardrails/logs:
 *   get:
 *     tags: [Guardrails]
 *     summary: Retrieve guardrail audit logs (admin/auditor only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200: { description: Paginated log entries }
 *       403: { description: Insufficient permissions }
 */
// Admin Monitor & Overrides
router.get('/logs', authenticate, authorizeRoles('ADMIN', 'AUDITOR'), getGuardrailLogs);
router.get('/logs/export', authenticate, authorizeRoles('ADMIN', 'AUDITOR'), exportGuardrailLogs);
router.get('/metrics', authenticate, authorizeRoles('ADMIN', 'AUDITOR'), getMetrics);
router.get('/overrides', authenticate, authorizeRoles('ADMIN', 'AUDITOR'), getOverrides);
router.post('/override/request', authenticate, postRequestOverride);
router.post('/override/approve', authenticate, authorizeRoles('ADMIN'), postApproveOverride);

// CRUD routes for Guardrail
router.post('/', authenticate, createGuardrail);
router.get('/', authenticate, getGuardrails);
router.get('/:id', authenticate, getGuardrailById);
router.patch('/:id', authenticate, updateGuardrail);
router.delete('/:id', authenticate, deleteGuardrail);

export default router;


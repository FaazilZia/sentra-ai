import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { getPolicies, getPolicyHealth, getPolicyVersions, createPolicy, getPolicyTemplates, duplicatePolicy, updatePolicy, deletePolicy } from '../controllers/policy.controller';
import { policyIdVersionsParamSchema, createPolicySchema } from '../validations/policy.validation';
import { enforcePolicyLimit } from '../middleware/plan.middleware';

const router = Router();

router.get('/health', authenticate, getPolicyHealth);
router.get(
  '/:policyId/versions',
  authenticate,
  validate(policyIdVersionsParamSchema),
  getPolicyVersions
);

import { PolicyVersioningService } from '../services/policyVersioning.service';

router.post('/:id/rollback', authenticate, async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { version } = req.body;
    if (!version) return res.status(400).json({ error: 'version number required' });
    const updated = await PolicyVersioningService.rollback(req.params.id, Number(version), organizationId);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /policies:
 *   get:
 *     tags: [Policies]
 *     summary: List all policies for the current organization
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of policies
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       name: { type: string }
 *                       status: { type: string, enum: [draft, active, archived] }
 *                       priority: { type: string, enum: [low, medium, high, critical] }
 *   post:
 *     tags: [Policies]
 *     summary: Create a new policy
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, status]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               status: { type: string, enum: [draft, active, archived] }
 *               priority: { type: string, enum: [low, medium, high, critical] }
 *               category: { type: string }
 *     responses:
 *       201: { description: Policy created }
 *       400: { description: Validation error }
 *       402: { description: Plan policy limit reached }
 */
router.get('/templates', authenticate, getPolicyTemplates);
router.get('/', authenticate, getPolicies);

router.post('/:id/duplicate', authenticate, duplicatePolicy);
router.post('/', authenticate, enforcePolicyLimit, validate(createPolicySchema), createPolicy);
router.put('/:id', authenticate, updatePolicy);
router.patch('/:id', authenticate, updatePolicy);
router.delete('/:id', authenticate, deletePolicy);

export default router;

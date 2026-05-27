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
router.get('/templates', authenticate, getPolicyTemplates);
router.get('/', authenticate, getPolicies);
router.post('/:id/duplicate', authenticate, duplicatePolicy);
router.post('/', authenticate, enforcePolicyLimit, validate(createPolicySchema), createPolicy);
router.patch('/:id', authenticate, updatePolicy);
router.delete('/:id', authenticate, deletePolicy);

export default router;

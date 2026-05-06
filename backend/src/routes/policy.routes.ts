import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { getPolicies, getPolicyHealth, getPolicyVersions, createPolicy, getPolicyTemplates, duplicatePolicy, updatePolicy } from '../controllers/policy.controller';
import { policyIdVersionsParamSchema, createPolicySchema } from '../validations/policy.validation';

const router = Router();

router.get('/health', authenticate, getPolicyHealth);
router.get(
  '/:policyId/versions',
  authenticate,
  validate(policyIdVersionsParamSchema),
  getPolicyVersions
);
router.get('/templates', authenticate, getPolicyTemplates);
router.get('/', authenticate, getPolicies);
router.post('/:id/duplicate', authenticate, duplicatePolicy);
router.post('/', authenticate, validate(createPolicySchema), createPolicy);
router.patch('/:id', authenticate, updatePolicy);

export default router;

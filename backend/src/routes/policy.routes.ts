import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { getPolicies, getPolicyHealth, getPolicyVersions, createPolicy } from '../controllers/policy.controller';
import { policyIdVersionsParamSchema, createPolicySchema } from '../validations/policy.validation';

const router = Router();

router.get('/health', authenticate, getPolicyHealth);
router.get(
  '/:policyId/versions',
  authenticate,
  validate(policyIdVersionsParamSchema),
  getPolicyVersions
);
router.get('/', authenticate, getPolicies);
router.post('/', authenticate, validate(createPolicySchema), createPolicy);

export default router;

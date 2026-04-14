import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createApiKeySchema, apiKeyIdParamSchema } from '../validations/admin.validation';
import { listApiKeys, createApiKey, deleteApiKey } from '../controllers/apiKey.controller';

const router = Router();

router.get('/dashboard', authenticate, authorizeRoles('ADMIN'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to the Admin Dashboard',
    data: { counts: { users: 10, incidents: 5 } }
  });
});

router.get('/api-keys', authenticate, authorizeRoles('ADMIN'), listApiKeys);
router.post('/api-keys', authenticate, authorizeRoles('ADMIN'), validate(createApiKeySchema), createApiKey);
router.delete(
  '/api-keys/:keyId',
  authenticate,
  authorizeRoles('ADMIN'),
  validate(apiKeyIdParamSchema),
  deleteApiKey
);

export default router;

import { Router } from 'express';
import { authenticate, authenticateScim, authorizeRoles } from '../middleware/auth.middleware';
import {
  initiateSamlSso,
  samlCallback,
  updateSsoConfig,
  getSamlMetadata,
  getScimUsers,
  createScimUser,
  updateScimUser,
  deleteScimUser
} from '../controllers/sso.controller';

const router = Router();

// SAML 2.0 browser endpoints (slug-based, no cookie/bearer token required)
router.get('/saml/:orgSlug', initiateSamlSso);
router.post('/saml/:orgSlug/callback', samlCallback);
router.get('/saml/:orgSlug/metadata', getSamlMetadata);

// SAML administrative configuration endpoints (requires JWT session authentication)
router.put('/sso/config', authenticate, authorizeRoles('ADMIN'), updateSsoConfig);
router.get('/sso/metadata/:orgSlug', getSamlMetadata);

// SCIM 2.0 provisioning endpoints (bearer auth verified)
router.get('/scim/v2/Users', authenticateScim, getScimUsers);
router.post('/scim/v2/Users', authenticateScim, createScimUser);
router.put('/scim/v2/Users/:id', authenticateScim, updateScimUser);
router.delete('/scim/v2/Users/:id', authenticateScim, deleteScimUser);

export default router;


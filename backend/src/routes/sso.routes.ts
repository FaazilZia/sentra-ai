import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  initiateSamlSso,
  samlCallback,
  getScimUsers,
  createScimUser,
  updateScimUser,
  deleteScimUser
} from '../controllers/sso.controller';

const router = Router();

// SAML 2.0 routes (Browser-based redirect/callback - no bearer token header, uses slug parameter)
router.get('/saml/:orgSlug', initiateSamlSso);
router.post('/saml/:orgSlug/callback', samlCallback);

// SCIM 2.0 routes (API-based sync - authenticated with standard X-API-Key or Bearer token)
router.get('/scim/v2/Users', authenticate, getScimUsers);
router.post('/scim/v2/Users', authenticate, createScimUser);
router.put('/scim/v2/Users/:id', authenticate, updateScimUser);
router.delete('/scim/v2/Users/:id', authenticate, deleteScimUser);

export default router;

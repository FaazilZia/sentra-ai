import { Router, NextFunction } from 'express';
import { authenticate, authenticateScim, authorizeRoles } from '../middleware/auth.middleware';
import {
  initiateSamlSso,
  samlCallback,
  updateSsoConfig,
  getSamlMetadata,
  getScimUsers,
  createScimUser,
  updateScimUser,
  deleteScimUser,
  getScimUserById,
  patchScimUser,
  getScimGroups,
  getScimGroupById,
  createScimGroup,
  updateScimGroup,
  patchScimGroup,
  deleteScimGroup,
  getServiceProviderConfig,
  getResourceTypes,
  getSchemas
} from '../controllers/sso.controller';

/**
 * @openapi
 * /scim/v2/ServiceProviderConfig:
 *   get:
 *     summary: Get SCIM Service Provider Config
 *     description: Returns the configuration and supported features of the SCIM service provider (no auth required).
 *     responses:
 *       200:
 *         description: Service Provider Config details
 *         content:
 *           application/scim+json:
 *             schema:
 *               type: object
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not Found
 *       422:
 *         description: Unprocessable Entity
 *       429:
 *         description: Too Many Requests
 *       500:
 *         description: Internal Server Error
 * 
 * /scim/v2/ResourceTypes:
 *   get:
 *     summary: Get SCIM Resource Types
 *     description: Returns the resource types supported by the SCIM service (no auth required).
 *     responses:
 *       200:
 *         description: Supported resource types
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not Found
 *       422:
 *         description: Unprocessable Entity
 *       429:
 *         description: Too Many Requests
 *       500:
 *         description: Internal Server Error
 * 
 * /scim/v2/Schemas:
 *   get:
 *     summary: Get SCIM Schemas
 *     description: Returns the list of schemas supported by the SCIM service (no auth required).
 *     responses:
 *       200:
 *         description: Supported schemas
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not Found
 *       422:
 *         description: Unprocessable Entity
 *       429:
 *         description: Too Many Requests
 *       500:
 *         description: Internal Server Error
 * 
 * /scim/v2/Users:
 *   get:
 *     summary: List SCIM Users
 *     description: Retrieve a list of SCIM users. Supports filtering by userName eq "email".
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of SCIM users
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not Found
 *       422:
 *         description: Unprocessable Entity
 *       429:
 *         description: Too Many Requests
 *       500:
 *         description: Internal Server Error
 *   post:
 *     summary: Create SCIM User
 *     description: Provision a new user in the system via SCIM.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/scim+json:
 *           schema:
 *             type: object
 *             required:
 *               - userName
 *               - emails
 *             properties:
 *               userName:
 *                 type: string
 *                 example: john.doe@example.com
 *               emails:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     value:
 *                       type: string
 *                     primary:
 *                       type: boolean
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not Found
 *       422:
 *         description: Unprocessable Entity
 *       429:
 *         description: Too Many Requests
 *       500:
 *         description: Internal Server Error
 * 
 * /scim/v2/Users/{id}:
 *   get:
 *     summary: Get SCIM User by ID
 *     description: Retrieve a single SCIM user by their identifier.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: SCIM User details
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not Found
 *       422:
 *         description: Unprocessable Entity
 *       429:
 *         description: Too Many Requests
 *       500:
 *         description: Internal Server Error
 *   put:
 *     summary: Replace SCIM User attributes
 *     description: Full replacement of user attributes via SCIM.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not Found
 *       422:
 *         description: Unprocessable Entity
 *       429:
 *         description: Too Many Requests
 *       500:
 *         description: Internal Server Error
 *   patch:
 *     summary: Patch SCIM User attributes
 *     description: Perform incremental updates on a SCIM user.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User patched successfully
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not Found
 *       422:
 *         description: Unprocessable Entity
 *       429:
 *         description: Too Many Requests
 *       500:
 *         description: Internal Server Error
 *   delete:
 *     summary: Delete SCIM User (Soft-delete)
 *     description: Sets the user's status to inactive in the system.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: User de-provisioned successfully
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not Found
 *       422:
 *         description: Unprocessable Entity
 *       429:
 *         description: Too Many Requests
 *       500:
 *         description: Internal Server Error
 * 
 * /scim/v2/Groups:
 *   get:
 *     summary: List SCIM Groups (Virtual roles)
 *     description: Lists the virtualized Groups representing system roles (ADMIN, MEMBER, VIEWER, AUDITOR, ENGINEER).
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of SCIM Groups (system roles)
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not Found
 *       422:
 *         description: Unprocessable Entity
 *       429:
 *         description: Too Many Requests
 *       500:
 *         description: Internal Server Error
 *   post:
 *     summary: Resolve or Update SCIM Group mapping
 *     description: Virtualized Groups design where SCIM Groups map to system roles (ADMIN, MEMBER, VIEWER, AUDITOR, ENGINEER). POST with an unknown group displayName returns a 400 error immediately.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/scim+json:
 *           schema:
 *             type: object
 *             required:
 *               - displayName
 *             properties:
 *               displayName:
 *                 type: string
 *                 example: ADMIN
 *     responses:
 *       201:
 *         description: Group processed successfully
 *       400:
 *         description: Group 'unknown-name' does not map to a known system role. Valid groups are ADMIN, MEMBER, VIEWER, AUDITOR, ENGINEER.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 schemas:
 *                   type: array
 *                   items:
 *                     type: string
 *                 status:
 *                   type: string
 *                   example: "400"
 *                 detail:
 *                   type: string
 *                   example: "Group 'unknown-name' does not map to a known system role. Valid groups are: ADMIN, MEMBER, VIEWER, AUDITOR, ENGINEER."
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not Found
 *       422:
 *         description: Unprocessable Entity
 *       429:
 *         description: Too Many Requests
 *       500:
 *         description: Internal Server Error
 * 
 * /scim/v2/Groups/{id}:
 *   get:
 *     summary: Get SCIM Group by ID
 *     description: Retrieve a SCIM group corresponding to a system role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Group details
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not Found
 *       422:
 *         description: Unprocessable Entity
 *       429:
 *         description: Too Many Requests
 *       500:
 *         description: Internal Server Error
 *   put:
 *     summary: Update SCIM Group by ID
 *     description: Update virtualized Group corresponding to a system role. If role is unknown, returns 400.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Group updated successfully
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not Found
 *       422:
 *         description: Unprocessable Entity
 *       429:
 *         description: Too Many Requests
 *       500:
 *         description: Internal Server Error
 *   patch:
 *     summary: Patch SCIM Group by ID
 *     description: Patch virtualized Group corresponding to a system role. If role is unknown, returns 400.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Group patched successfully
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not Found
 *       422:
 *         description: Unprocessable Entity
 *       429:
 *         description: Too Many Requests
 *       500:
 *         description: Internal Server Error
 *   delete:
 *     summary: Delete SCIM Group
 *     description: Clean up SCIM Group provisioning.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Group deleted successfully
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not Found
 *       422:
 *         description: Unprocessable Entity
 *       429:
 *         description: Too Many Requests
 *       500:
 *         description: Internal Server Error
 */
const router = Router();

// Middleware to set Content-Type header on all SCIM 2.0 endpoints
const scimHeaderMiddleware = (req: any, res: any, next: NextFunction) => {
  res.setHeader('Content-Type', 'application/scim+json');
  next();
};

// SAML 2.0 browser endpoints (slug-based, no cookie/bearer token required)
router.get('/saml/:orgSlug', initiateSamlSso);
router.post('/saml/:orgSlug/callback', samlCallback);
router.get('/saml/:orgSlug/metadata', getSamlMetadata);

// SAML administrative configuration endpoints (requires JWT session authentication)
router.put('/sso/config', authenticate, authorizeRoles('ADMIN'), updateSsoConfig);
router.get('/sso/metadata/:orgSlug', getSamlMetadata);

// Apply SCIM header middleware to all SCIM routes
router.use('/scim/v2', scimHeaderMiddleware);

// Discovery endpoints (no authentication required per RFC 7644 §4)
router.get('/scim/v2/ServiceProviderConfig', getServiceProviderConfig);
router.get('/scim/v2/ResourceTypes', getResourceTypes);
router.get('/scim/v2/Schemas', getSchemas);

// SCIM 2.0 provisioning endpoints (bearer auth verified)
router.get('/scim/v2/Users', authenticateScim, getScimUsers);
router.post('/scim/v2/Users', authenticateScim, createScimUser);
router.get('/scim/v2/Users/:id', authenticateScim, getScimUserById);
router.put('/scim/v2/Users/:id', authenticateScim, updateScimUser);
router.patch('/scim/v2/Users/:id', authenticateScim, patchScimUser);
router.delete('/scim/v2/Users/:id', authenticateScim, deleteScimUser);

// SCIM 2.0 group provisioning endpoints (bearer auth verified)
router.get('/scim/v2/Groups', authenticateScim, getScimGroups);
router.post('/scim/v2/Groups', authenticateScim, createScimGroup);
router.get('/scim/v2/Groups/:id', authenticateScim, getScimGroupById);
router.put('/scim/v2/Groups/:id', authenticateScim, updateScimGroup);
router.patch('/scim/v2/Groups/:id', authenticateScim, patchScimGroup);
router.delete('/scim/v2/Groups/:id', authenticateScim, deleteScimGroup);

export default router;


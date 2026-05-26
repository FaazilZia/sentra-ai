import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';

/**
 * Factory for ISO framework routes (ISO 27001 / ISO 42001).
 * Eliminates duplication between iso27001.routes.ts and iso42001.routes.ts.
 */
export function createIsoFrameworkRouter(controller: {
  getFrameworkOverview: any;
  updateImplementation: any;
  getComplianceScore: any;
}) {
  const router = Router();
  router.use(authenticate);
  router.get('/overview', controller.getFrameworkOverview);
  router.patch('/controls/:controlCode/implementation', authorizeRoles('ADMIN', 'ENGINEER'), controller.updateImplementation);
  router.get('/score', controller.getComplianceScore);
  return router;
}

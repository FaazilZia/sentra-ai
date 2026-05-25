import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';
import {
  getFrameworkOverview,
  updateImplementation,
  getComplianceScore
} from '../controllers/iso27001.controller';

const router = Router();

router.use(authenticate);

router.get('/overview', getFrameworkOverview);
router.patch('/controls/:controlCode/implementation', authorizeRoles('ADMIN', 'ENGINEER'), updateImplementation);
router.get('/score', getComplianceScore);

export default router;

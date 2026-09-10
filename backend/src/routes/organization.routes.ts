import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';
import { getOrganizationById, updateAlertSettings, testAlert, getSdkStatus } from '../controllers/organization.controller';

const router = Router();

router.get('/sdk-status', authenticate, getSdkStatus);
router.get('/:id/sdk-status', authenticate, getSdkStatus);
router.get('/:id', authenticate, getOrganizationById);
router.patch('/alert-settings', authenticate, authorizeRoles('ADMIN'), updateAlertSettings);
router.post('/test-alert', authenticate, authorizeRoles('ADMIN'), testAlert);

export default router;

import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';
import {
  getOrganizationById,
  updateAlertSettings,
  testAlert,
  getSdkStatus,
  getEmailAlertSettings,
  updateEmailAlertSettings,
  testEmailAlert
} from '../controllers/organization.controller';
import { emailAlertTestRateLimiter } from '../config/rateLimit';

const router = Router();

// Per-organization email alert channel endpoints
router.get('/email-alerts', authenticate, getEmailAlertSettings);
router.put('/email-alerts', authenticate, authorizeRoles('ADMIN'), updateEmailAlertSettings);
router.post('/email-alerts/test', authenticate, authorizeRoles('ADMIN'), emailAlertTestRateLimiter, testEmailAlert);

router.get('/sdk-status', authenticate, getSdkStatus);
router.get('/:id/sdk-status', authenticate, getSdkStatus);
router.get('/:id', authenticate, getOrganizationById);
router.patch('/alert-settings', authenticate, authorizeRoles('ADMIN'), updateAlertSettings);
router.post('/test-alert', authenticate, authorizeRoles('ADMIN'), testAlert);

export default router;

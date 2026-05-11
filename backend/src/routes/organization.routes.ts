import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';
import { getOrganizationById, updateAlertSettings, testAlert } from '../controllers/organization.controller';

import { validate } from '../middleware/validate.middleware';
import { updateAlertSettingsSchema, emptySchema } from '../validations/organization.validation';

const router = Router();

router.get('/:id', authenticate, getOrganizationById);
router.patch('/alert-settings', authenticate, authorizeRoles('ADMIN'), validate(updateAlertSettingsSchema), updateAlertSettings);
router.post('/test-alert', authenticate, authorizeRoles('ADMIN'), validate(emptySchema), testAlert);


export default router;

import { Router } from 'express';
import { getIncidents, getIncidentById, resolveIncident } from '../controllers/incident.controller';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { getIncidentByIdSchema, resolveIncidentSchema } from '../validations/incident.validation';

const router = Router();

router.get('/', authenticate, getIncidents);
router.get('/:id', authenticate, validate(getIncidentByIdSchema), getIncidentById);
router.patch('/:id/resolve', authenticate, authorizeRoles('ADMIN'), validate(resolveIncidentSchema), resolveIncident);

export default router;

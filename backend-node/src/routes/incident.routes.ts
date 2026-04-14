import { Router } from 'express';
import { 
  getIncidents, 
  getIncidentById, 
  updateIncidentStatus, 
  logIncident, 
  triggerScan, 
  getScanStatus 
} from '../controllers/incident.controller';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { 
  getIncidentByIdSchema, 
  updateIncidentStatusSchema, 
  logIncidentSchema, 
  triggerScanSchema 
} from '../validations/incident.validation';

const router = Router();

// Public/Partner SDK Endpoint (Auth via API Key or Bearer Token)
router.post('/log', authenticate, validate(logIncidentSchema), logIncident);

// Dashboard Incident Management
router.get('/', authenticate, getIncidents);
router.get('/:id', authenticate, validate(getIncidentByIdSchema), getIncidentById);
router.patch('/:id/status', authenticate, authorizeRoles('ADMIN'), validate(updateIncidentStatusSchema), updateIncidentStatus);

// Deep Scan Engine
router.post('/scan', authenticate, authorizeRoles('ADMIN'), validate(triggerScanSchema), triggerScan);
router.get('/scan-status', authenticate, getScanStatus);

export default router;

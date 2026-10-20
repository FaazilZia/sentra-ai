import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createConnectorSchema, testConnectorSchema } from '../validations/connector.validation';
import {
  listConnectors,
  createConnector,
  getExecutiveOverview,
  deleteConnector,
  testConnector,
  triggerConnectorScan,
} from '../controllers/connector.controller';

const router = Router();

router.get('/', authenticate, listConnectors);
router.get('/overview', authenticate, getExecutiveOverview);
router.post('/test', authenticate, validate(testConnectorSchema), testConnector);
router.post('/', authenticate, validate(createConnectorSchema), createConnector);
router.post('/:id/scan', authenticate, triggerConnectorScan);
router.delete('/:id', authenticate, deleteConnector);

export default router;

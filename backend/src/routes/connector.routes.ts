import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createConnectorSchema } from '../validations/connector.validation';
import { listConnectors, createConnector, getExecutiveOverview, deleteConnector } from '../controllers/connector.controller';

const router = Router();

router.get('/', authenticate, listConnectors);
router.get('/overview', authenticate, getExecutiveOverview);
router.post('/', authenticate, validate(createConnectorSchema), createConnector);
router.delete('/:id', authenticate, deleteConnector);

export default router;

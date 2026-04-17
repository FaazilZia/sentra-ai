import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createConnectorSchema } from '../validations/connector.validation';
import { listConnectors, createConnector } from '../controllers/connector.controller';

const router = Router();

router.get('/', authenticate, listConnectors);
router.post('/', authenticate, validate(createConnectorSchema), createConnector);

export default router;

import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createAISystemSchema, updateAISystemSchema } from '../validations/aiSystem.validation';
import {
  listAISystems,
  getAISystem,
  createAISystem,
  updateAISystem,
  deleteAISystem,
  syncConnectorAgents
} from '../controllers/aiSystem.controller';

const router = Router();

router.get('/', authenticate, listAISystems);
router.post('/sync', authenticate, syncConnectorAgents);
router.get('/:id', authenticate, getAISystem);
router.post('/', authenticate, validate(createAISystemSchema), createAISystem);
router.patch('/:id', authenticate, validate(updateAISystemSchema), updateAISystem);
router.delete('/:id', authenticate, deleteAISystem);


export default router;

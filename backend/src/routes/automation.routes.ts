import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  listAutomations,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  toggleAutomation
} from '../controllers/automation.controller';

const router = Router();

router.get('/', authenticate, listAutomations);
router.post('/', authenticate, createAutomation);
router.patch('/:id', authenticate, updateAutomation);
router.delete('/:id', authenticate, deleteAutomation);
router.patch('/:id/toggle', authenticate, toggleAutomation);

export default router;

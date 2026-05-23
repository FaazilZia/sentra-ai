import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getSlackConfig,
  saveSlackConfig,
  deleteSlackConfig,
  testSlackConnection
} from '../controllers/slack.controller';

const router = Router();

router.get('/config', authenticate, getSlackConfig);
router.post('/config', authenticate, saveSlackConfig);
router.put('/config', authenticate, saveSlackConfig);
router.delete('/config', authenticate, deleteSlackConfig);
router.post('/test', authenticate, testSlackConnection);

export default router;

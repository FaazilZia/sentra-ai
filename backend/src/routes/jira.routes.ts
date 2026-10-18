import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getJiraConfig,
  saveJiraConfig,
  deleteJiraConfig,
  testJiraConnection
} from '../controllers/jira.controller';

const router = Router();

router.get('/config', authenticate, getJiraConfig);
router.post('/config', authenticate, saveJiraConfig);
router.put('/config', authenticate, saveJiraConfig);
router.delete('/config', authenticate, deleteJiraConfig);
router.post('/test', authenticate, testJiraConnection);

export default router;

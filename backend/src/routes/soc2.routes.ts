import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getChapters, getFrameworkControls, getStats, updateControl } from '../controllers/soc2.controller';

const router = Router();

router.get('/chapters', authenticate, getChapters);
router.get('/controls', authenticate, getFrameworkControls);
router.get('/stats', authenticate, getStats);
router.get('/overview', authenticate, getStats); // Mapping overview to getStats for ReadinessDashboard compatibility
router.patch('/controls/:id', authenticate, updateControl);

export default router;

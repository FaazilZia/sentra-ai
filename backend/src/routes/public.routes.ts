import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getPublicTrustData, updatePublicTrustSetting } from '../controllers/public.controller';

const router = Router();

// Completely anonymous public route bypasses authentication middleware
router.get('/:orgSlug/trust', getPublicTrustData);

// Admin-only toggle setting requires authentication
router.patch('/settings', authenticate, updatePublicTrustSetting);

export default router;

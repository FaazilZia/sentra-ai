import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  createShareLink,
  getShareLinks,
  revokeShareLink,
  resolveShareLink
} from '../controllers/shareLink.controller';

const router = Router();

// Public route — explicitly bypasses any auth middleware checks
router.get('/view/:token', resolveShareLink);

// Protected management routes
router.post('/', authenticate, createShareLink);
router.get('/:resourceType/:resourceId', authenticate, getShareLinks);
router.delete('/:id', authenticate, revokeShareLink);

export default router;

import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getMe } from '../controllers/auth.controller';
import { requireTenant } from '../middleware/tenant.middleware';
import prisma from '../config/db';
import { sendSuccess } from '../utils/controllerHelpers';

const router = Router();

// Get list of active users in the organization
router.get('/', authenticate, requireTenant, async (req: any, res) => {
  const users = await prisma.users.findMany({
    where: { organizationId: req.user.organizationId, is_active: true },
    select: { id: true, full_name: true, email: true, role: true },
    orderBy: { full_name: 'asc' }
  });
  return sendSuccess(res, users);
});

// Get current user profile
router.get('/me', authenticate, getMe);

// Any authenticated user can access this
router.get('/dashboard', authenticate, getMe);

export default router;

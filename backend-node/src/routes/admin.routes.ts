import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';

const router = Router();

// Only admin can access this
router.get('/dashboard', authenticate, authorizeRoles('ADMIN'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to the Admin Dashboard',
    data: { counts: { users: 10, incidents: 5 } }
  });
});

export default router;

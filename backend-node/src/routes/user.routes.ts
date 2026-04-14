import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getMe } from '../controllers/auth.controller';

const router = Router();

// Get current user profile
router.get('/me', authenticate, getMe);

// Any authenticated user can access this
router.get('/dashboard', authenticate, (req: any, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to your User Dashboard',
    data: { user: req.user }
  });
});

export default router;

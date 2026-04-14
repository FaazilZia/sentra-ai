import { Router } from 'express';
import { register, login, refreshToken, getMe } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { registerSchema, loginSchema, refreshTokenSchema } from '../validations/auth.validation';
import { authRateLimiter } from '../config/rateLimit';

const router = Router();

router.post('/register', authRateLimiter, validate(registerSchema), register);
router.post('/login', authRateLimiter, validate(loginSchema), login);
router.post('/refresh-token', authRateLimiter, validate(refreshTokenSchema), refreshToken);
router.get('/me', authenticate, getMe);

export default router;

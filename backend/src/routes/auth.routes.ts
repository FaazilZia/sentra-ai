import { Router } from 'express';
import { register, login, refreshToken, getMe, googleLogin } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { registerSchema, loginSchema, refreshTokenSchema } from '../validations/auth.validation';
import { authRateLimiter } from '../config/rateLimit';

const router = Router();

router.post('/register', authRateLimiter, validate(registerSchema), register);
router.post('/login', authRateLimiter, validate(loginSchema), login);
router.post('/google', authRateLimiter, googleLogin);
router.post('/refresh-token', authRateLimiter, validate(refreshTokenSchema), refreshToken);
router.post('/refresh', authRateLimiter, validate(refreshTokenSchema), refreshToken); // alias
router.get('/me', authenticate, getMe);

export default router;

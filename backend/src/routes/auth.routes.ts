import { Router } from 'express';
import { register, login, refreshToken, getMe, googleLogin, googleCallback, logout } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { registerSchema, loginSchema, refreshTokenSchema, googleLoginSchema } from '../validations/auth.validation';
import { authRateLimiter } from '../config/rateLimit';
import { MFAService } from '../services/mfa.service';
import prisma from '../config/db';

const router = Router();

router.post('/register', authRateLimiter, validate(registerSchema), register);
router.post('/login', authRateLimiter, validate(loginSchema), login);
router.post('/google', authRateLimiter, validate(googleLoginSchema), googleLogin);
router.get('/google/callback', googleCallback);
router.post('/refresh-token', authRateLimiter, validate(refreshTokenSchema), refreshToken);
router.post('/refresh', authRateLimiter, validate(refreshTokenSchema), refreshToken); // alias
router.get('/me', authenticate, getMe);

router.post('/mfa/setup', authenticate, async (req: any, res) => {
  try {
    const { id: userId, email } = req.user;
    const result = await MFAService.setupMFA(userId, email);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/mfa/enable', authenticate, async (req: any, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'token is required' });
    const result = await MFAService.enableMFA(req.user.id, token);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/mfa/disable', authenticate, async (req: any, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'token is required' });
    const isValid = await MFAService.verifyToken(req.user.id, token);
    if (!isValid) return res.status(400).json({ error: 'Invalid MFA token' });
    await MFAService.disableMFA(req.user.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/mfa/status', authenticate, async (req: any, res) => {
  try {
    const user = await prisma.users.findUnique({
      where: { id: req.user.id },
      select: { mfa_enabled: true },
    });
    res.json({ success: true, data: { enabled: user?.mfa_enabled || false } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;


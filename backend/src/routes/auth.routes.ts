import { Router } from 'express';
import { register, login, refreshToken, getMe, googleLogin, googleCallback, logout, forgotPassword, resetPassword, verifyEmail, resendVerification, changePassword } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { registerSchema, loginSchema, refreshTokenSchema, googleLoginSchema, forgotPasswordSchema, resetPasswordSchema, resendVerificationSchema } from '../validations/auth.validation';
import { registerLimiter, loginLimiter, resetLimiter, verifyLimiter } from '../config/rateLimit';
import { MFAService } from '../services/mfa.service';
import prisma from '../config/db';

const router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new user account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, format: password, minLength: 8 }
 *               name: { type: string }
 *     responses:
 *       201: { description: Account created — verification email sent }
 *       400: { description: Validation error }
 *       409: { description: Email already in use }
 *       429: { description: Rate limit exceeded }
 */
router.post('/register', registerLimiter, validate(registerSchema), register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Login with email and password
 *     description: Returns JWT access token and rotating refresh token. Rate-limited to 10 requests / 15 min per IP.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email, example: admin@sentra.ai }
 *               password: { type: string, format: password }
 *     responses:
 *       200:
 *         description: Authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken: { type: string }
 *                 refreshToken: { type: string }
 *       401: { description: Invalid credentials }
 *       429: { description: Rate limit exceeded }
 */
router.post('/login', loginLimiter, validate(loginSchema), login);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Authentication]
 *     summary: Get the currently authenticated user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string }
 *                 email: { type: string }
 *                 name: { type: string }
 *                 role: { type: string }
 *                 organizationId: { type: string }
 *       401: { description: Not authenticated }
 */

router.post('/google', loginLimiter, validate(googleLoginSchema), googleLogin);
router.get('/google/callback', googleCallback);
router.post('/refresh-token', loginLimiter, validate(refreshTokenSchema), refreshToken);
router.post('/refresh', loginLimiter, validate(refreshTokenSchema), refreshToken); // alias
router.get('/me', authenticate, getMe);
router.post('/logout', logout);
router.post('/change-password', authenticate, changePassword);

router.post('/forgot-password', resetLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', resetLimiter, validate(resetPasswordSchema), resetPassword);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', verifyLimiter, validate(resendVerificationSchema), resendVerification);

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


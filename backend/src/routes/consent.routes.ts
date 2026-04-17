import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getConsentHistory, grantConsent, withdrawConsent } from '../controllers/consent.controller';

const router = Router();

router.get('/history', authenticate, getConsentHistory);
router.post('/grant', authenticate, grantConsent);
router.post('/withdraw', authenticate, withdrawConsent);

export default router;

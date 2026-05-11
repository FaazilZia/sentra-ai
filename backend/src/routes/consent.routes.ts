import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getConsentHistory, grantConsent, withdrawConsent } from '../controllers/consent.controller';

import { validate } from '../middleware/validate.middleware';
import { emptySchema } from '../validations/consent.validation';

const router = Router();

router.get('/history', authenticate, getConsentHistory);
router.post('/grant', authenticate, validate(emptySchema), grantConsent);
router.post('/withdraw', authenticate, validate(emptySchema), withdrawConsent);


export default router;

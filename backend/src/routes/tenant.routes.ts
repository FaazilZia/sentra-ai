import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getTenantById } from '../controllers/tenant.controller';

const router = Router();

router.get('/:id', authenticate, getTenantById);

export default router;

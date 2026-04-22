import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getOrganizationById } from '../controllers/organization.controller';

const router = Router();

router.get('/:id', authenticate, getOrganizationById);

export default router;

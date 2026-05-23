import { Router } from 'express';
import { executeGlobalSearch } from '../controllers/search.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, executeGlobalSearch);

export default router;

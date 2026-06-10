import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { generateReport, downloadReport } from '../controllers/reportCRUD.controller';

const router = Router();

router.post('/generate', authenticate, generateReport);
router.get('/:jobId/download', authenticate, downloadReport);

export default router;

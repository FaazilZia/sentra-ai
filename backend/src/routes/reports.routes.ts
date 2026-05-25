import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getExecutivePdf, getExecutiveDocx, getPolicyPdf, getPolicyDocx } from '../controllers/executiveReport.controller';

const router = Router();

router.get('/compliance/pdf', authenticate, getExecutivePdf);
router.get('/compliance/docx', authenticate, getExecutiveDocx);
router.get('/policy/:policyId/pdf', authenticate, getPolicyPdf);
router.get('/policy/:policyId/docx', authenticate, getPolicyDocx);

export default router;

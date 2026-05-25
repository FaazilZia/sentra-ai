import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getActiveForm,
  createSubmission,
  getSubmissions,
  approveSubmission,
  rejectSubmission,
  suggestQuestions,
  getRiskScore
} from '../controllers/intakeForm.controller';

const router = Router();

router.get('/form', authenticate, getActiveForm);
router.post('/submissions', authenticate, createSubmission);
router.get('/submissions', authenticate, getSubmissions);
router.post('/submissions/:id/approve', authenticate, approveSubmission);
router.post('/submissions/:id/reject', authenticate, rejectSubmission);
router.post('/suggest-questions', authenticate, suggestQuestions);
router.get('/submissions/:id/risk-score', authenticate, getRiskScore);

export default router;

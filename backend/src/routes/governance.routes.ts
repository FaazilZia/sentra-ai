import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createRiskAssessmentSchema,
  submitRiskAssessmentSchema,
  createImpactAssessmentSchema,
  updateImpactAssessmentSchema,
  createControlSchema,
  updateControlImplementationSchema,
  createVendorAiToolSchema,
  reviewVendorAiToolSchema,
  updateModelCardSchema,
  updateObligationSchema
} from '../validations/governance.validation';
import {
  listRiskAssessments,
  getRiskAssessment,
  createRiskAssessment,
  submitRiskAssessment,
  listImpactAssessments,
  createImpactAssessment,
  updateImpactAssessment,
  deleteImpactAssessment,
  listControls,
  createControl,
  updateControlImplementation,
  listVendorAiTools,
  createVendorAiTool,
  reviewVendorAiTool,
  getModelCard,
  updateModelCard,
  listObligations,
  updateObligation
} from '../controllers/governance.controller';

const router = Router();

// Risk Assessments
router.get('/risk-assessments', authenticate, listRiskAssessments);
router.get('/risk-assessments/:id', authenticate, getRiskAssessment);
router.post('/risk-assessments', authenticate, validate(createRiskAssessmentSchema), createRiskAssessment);
router.put('/risk-assessments/:id/submit', authenticate, validate(submitRiskAssessmentSchema), submitRiskAssessment);

// Impact Assessments
router.get('/impact-assessments', authenticate, listImpactAssessments);
router.post('/impact-assessments', authenticate, validate(createImpactAssessmentSchema), createImpactAssessment);
router.patch('/impact-assessments/:id', authenticate, validate(updateImpactAssessmentSchema), updateImpactAssessment);
router.delete('/impact-assessments/:id', authenticate, deleteImpactAssessment);

// Controls Library & Implementations
router.get('/controls', authenticate, listControls);
router.post('/controls', authenticate, validate(createControlSchema), createControl);
router.patch('/controls/implementations/:controlId', authenticate, validate(updateControlImplementationSchema), updateControlImplementation);

// Vendor AI tools
router.get('/vendor-ai-tools', authenticate, listVendorAiTools);
router.post('/vendor-ai-tools', authenticate, validate(createVendorAiToolSchema), createVendorAiTool);
router.patch('/vendor-ai-tools/:id/review', authenticate, authorizeRoles('ADMIN'), validate(reviewVendorAiToolSchema), reviewVendorAiTool);

// Model Cards
router.get('/ai-systems/:aiSystemId/model-card', authenticate, getModelCard);
router.put('/ai-systems/:aiSystemId/model-card', authenticate, validate(updateModelCardSchema), updateModelCard);

// Compliance Obligations
router.get('/compliance/obligations', authenticate, listObligations);
router.patch('/compliance/obligations/:id', authenticate, validate(updateObligationSchema), updateObligation);

export default router;

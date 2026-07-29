import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';
import { 
  getAuditProof, 
  getFixTasks, 
  postFixTasks, 
  postEvidence, 
  postReEvaluate, 
  getHistory,
  getAuditLogs,
  getExportReport,
  getAlerts,
  postMarkAlertRead,
  getComplianceStats,
  getUnifiedFrameworkView,
} from '../controllers/compliance.controller';
import {
  getNistAiRmfOverview,
  getNistAiRmfControls,
  updateNistAiRmfImplementation,
  getNistAiRmfCrossFrameworkImpact,
  exportNistAiRmfSignedConformity,
  getNistAiRmfHealth
} from '../controllers/nistAiRmf.controller';

const router = Router();

router.get('/stats', authenticate, getComplianceStats);
router.get('/audit-proof', authenticate, getAuditProof);

router.post('/fix-tasks', authenticate, authorizeRoles('ADMIN'), postFixTasks);
router.get('/fix-tasks/:featureId', authenticate, getFixTasks);
router.post('/evidence', authenticate, authorizeRoles('ADMIN', 'ENGINEER'), postEvidence);
router.post('/re-evaluate', authenticate, authorizeRoles('ADMIN'), postReEvaluate);
router.get('/history/:featureId', authenticate, getHistory);
router.get('/audit-logs', authenticate, authorizeRoles('ADMIN', 'AUDITOR'), getAuditLogs);
router.get('/export/:featureId', authenticate, getExportReport);
router.get('/alerts', authenticate, getAlerts);
router.post('/alerts/mark-read', authenticate, postMarkAlertRead);

// Unified Per-Framework View (AISPM Posture Findings + AIDR Runtime Blocks)
router.get('/unified/:framework', authenticate, getUnifiedFrameworkView);

// NIST AI RMF 1.0 Routes
router.get('/nist-ai-rmf/overview', authenticate, getNistAiRmfOverview);
router.get('/nist-ai-rmf/controls', authenticate, getNistAiRmfControls);
router.patch('/nist-ai-rmf/implementation/:subcategoryCode', authenticate, authorizeRoles('ADMIN', 'ENGINEER'), updateNistAiRmfImplementation);
router.get('/nist-ai-rmf/cross-framework-impact/:subcategoryCode', authenticate, getNistAiRmfCrossFrameworkImpact);
router.get('/nist-ai-rmf/export', authenticate, authorizeRoles('ADMIN', 'AUDITOR'), exportNistAiRmfSignedConformity);
router.get('/nist-ai-rmf/health', authenticate, getNistAiRmfHealth);

export default router;

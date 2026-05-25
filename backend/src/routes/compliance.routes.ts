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
  getComplianceStats
} from '../controllers/compliance.controller';
import {
  getEuAiActOverview,
  getEuAiActArticle,
  getEuAiActControls,
  updateEuAiActImplementation,
  addEuAiActEvidence
} from '../controllers/euAiAct.controller';



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

// EU AI Act Routes
router.get('/eu-ai-act/overview', authenticate, getEuAiActOverview);
router.get('/eu-ai-act/articles/:articleNumber', authenticate, getEuAiActArticle);
router.get('/eu-ai-act/controls', authenticate, getEuAiActControls);
router.patch('/eu-ai-act/controls/:controlCode/implementation', authenticate, authorizeRoles('ADMIN', 'ENGINEER'), updateEuAiActImplementation);
router.post('/eu-ai-act/evidence/:controlCode', authenticate, authorizeRoles('ADMIN', 'ENGINEER'), addEuAiActEvidence);



export default router;

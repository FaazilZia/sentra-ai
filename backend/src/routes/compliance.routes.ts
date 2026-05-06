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



export default router;

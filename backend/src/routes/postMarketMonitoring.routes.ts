import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { PostMarketMonitoringService } from '../services/postMarketMonitoring.service';
import {
  getDashboard,
  generateReport
} from '../controllers/postMarketMonitoring.controller';

const router = Router();

router.use(authenticate);

router.get('/dashboard', getDashboard);
router.get('/report', generateReport);

router.post('/schedule', authenticate, async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;
    const report = await PostMarketMonitoringService.generateMonitoringReport(organizationId);
    res.json({ success: true, data: report });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

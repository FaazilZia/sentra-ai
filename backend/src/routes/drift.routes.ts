import { Router } from 'express';
import { DriftService } from '../services/drift.service';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/alerts', authenticate, async (req: any, res) => {
  try {
    const alerts = await DriftService.listAlerts(req.user.companyId);
    res.json(alerts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/detect', authenticate, async (req: any, res) => {
  try {
    const alerts = await DriftService.detectDrift(req.user.companyId);
    res.json(alerts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/resolve/:id', authenticate, async (req: any, res) => {
  try {
    await DriftService.resolveAlert(req.params.id, req.user.companyId);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

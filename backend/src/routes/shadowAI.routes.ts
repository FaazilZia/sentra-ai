import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { ShadowAIService } from '../services/shadowAI.service';

const router = Router();

/**
 * GET /api/v1/shadow-ai/detections
 * Returns all shadow AI detection metrics and incident lists for the organization.
 */
router.get('/detections', authenticate, async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;
    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organization context missing' });
    }

    const data = await ShadowAIService.getShadowAIDetections(organizationId);
    res.json({ success: true, ...data, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

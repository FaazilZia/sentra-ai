import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import prisma from '../config/db';
import { DriftAlertService } from '../services/driftAlert.service';

const router = Router();

/**
 * GET /api/v1/drift/alerts
 * Retrieves behavioral drift alerts for the current organization.
 * Query Parameters:
 *   - status: 'open' | 'resolved'
 *   - agentId: optional agent UUID
 */
router.get('/alerts', authenticate, async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { status, agentId } = req.query;

    const whereClause: any = { organizationId };

    if (status) {
      whereClause.status = status as string;
    }
    if (agentId) {
      whereClause.agentId = agentId as string;
    }

    const alerts = await prisma.drift_alerts.findMany({
      where: whereClause,
      orderBy: { timestamp: 'desc' },
    });

    res.json({ success: true, data: alerts });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/drift/scan
 * Manually triggers a real-time behavioral drift scan for the organization.
 */
router.post('/scan', authenticate, async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;

    // Trigger behavioral scan
    const scanResult = await DriftAlertService.runDriftScan(organizationId);

    // Fetch the updated open alerts for immediate UI feedback
    const alerts = await prisma.drift_alerts.findMany({
      where: {
        organizationId,
        status: 'open',
      },
      orderBy: { timestamp: 'desc' },
    });

    res.json({ success: true, scanResult, data: alerts });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Backward compatibility alias for /detect
router.post('/detect', authenticate, async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;
    const scanResult = await DriftAlertService.runDriftScan(organizationId);
    const alerts = await prisma.drift_alerts.findMany({
      where: {
        organizationId,
        status: 'open',
      },
      orderBy: { timestamp: 'desc' },
    });
    res.json({ success: true, scanResult, data: alerts });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/v1/drift/alerts/:id/resolve
 * Resolves an active drift alert.
 */
router.patch('/alerts/:id/resolve', authenticate, async (req: any, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const alert = await prisma.drift_alerts.findFirst({
      where: { id, organizationId },
    });

    if (!alert) {
      return res.status(404).json({ error: 'Drift alert not found' });
    }

    const updated = await prisma.drift_alerts.update({
      where: { id },
      data: { status: 'resolved' },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Backward compatibility alias for POST /resolve/:id
router.post('/resolve/:id', authenticate, async (req: any, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const alert = await prisma.drift_alerts.findFirst({
      where: { id, organizationId },
    });

    if (!alert) {
      return res.status(404).json({ error: 'Drift alert not found' });
    }

    const updated = await prisma.drift_alerts.update({
      where: { id },
      data: { status: 'resolved' },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

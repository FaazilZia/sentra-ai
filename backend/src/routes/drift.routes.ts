import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import prisma from '../config/db';
import { DriftAlertService } from '../services/driftAlert.service';
import { DriftBaselineService } from '../services/driftBaseline.service';

const router = Router();

/**
 * GET /api/v1/drift/alerts
 * Returns open drift alerts for the current organization.
 * Query params: status (open|resolved), agentId
 */
router.get('/alerts', authenticate, async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { status, agentId } = req.query;

    const whereClause: any = { organizationId };
    if (status) whereClause.status = status as string;
    if (agentId) whereClause.agentId = agentId as string;

    const alerts = await prisma.drift_alerts.findMany({
      where: whereClause,
      orderBy: { detectedAt: 'desc' },
      take: 50,
    });

    res.json({ success: true, alerts, data: alerts });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/drift/alerts/:agentId
 * Returns all drift alerts for a specific agent.
 */
router.get('/alerts/:agentId', authenticate, async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { agentId } = req.params;

    const alerts = await prisma.drift_alerts.findMany({
      where: { organizationId, agentId },
      orderBy: { detectedAt: 'desc' },
    });

    res.json({ success: true, alerts, data: alerts });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const resolveDriftAlert = async (req: any, res: any) => {
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
};

const runDriftScanAndGetAlerts = async (req: any, res: any) => {
  try {
    const organizationId = req.user.organizationId;
    const scanResult = await DriftAlertService.runDriftScan(organizationId);

    const alerts = await prisma.drift_alerts.findMany({
      where: { organizationId, status: 'open' },
      orderBy: { detectedAt: 'desc' },
    });

    res.json({ success: true, scanResult, alerts, data: alerts });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * PATCH /api/v1/drift/alerts/:id/resolve
 * Resolves an active drift alert.
 */
router.patch('/alerts/:id/resolve', authenticate, resolveDriftAlert);

/**
 * POST /api/v1/drift/scan
 * Manually triggers a behavioral drift scan for the organization.
 */
router.post('/scan', authenticate, runDriftScanAndGetAlerts);

// Backward-compatibility alias for POST /detect
router.post('/detect', authenticate, runDriftScanAndGetAlerts);

// Backward-compatibility alias for POST /resolve/:id
router.post('/resolve/:id', authenticate, resolveDriftAlert);

/**
 * POST /api/v1/drift/baseline/:agentId
 * Manually re-computes the behavioral baseline for a specific agent.
 * Useful when an agent has been running for a while and its approved
 * behaviour has expanded.
 */
router.post('/baseline/:agentId', authenticate, async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { agentId } = req.params;

    // Verify agent belongs to this org
    const agent = await prisma.ai_agents.findFirst({
      where: { id: agentId, organizationId },
    });
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const baseline = await DriftBaselineService.computeBaseline(agentId);
    res.json({
      success: true,
      data: {
        agentId,
        agentName: agent.name,
        baselineActions: baseline,
        baselineCount: baseline.length,
        sampledAt: new Date(),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/drift/baseline/refresh-all
 * Re-computes baselines for all stale agents in the org.
 */
router.post('/baseline/refresh-all', authenticate, async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;
    const count = await DriftBaselineService.refreshStaleBaselines(organizationId);
    res.json({ success: true, data: { refreshed: count } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/baseline/backfill-all', authenticate, async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;
    const agents = await prisma.ai_agents.findMany({
      where: { organizationId, baselineActions: { isEmpty: true } },
    });
    let count = 0;
    for (const agent of agents) {
      const baseline = await DriftBaselineService.computeBaseline(agent.id);
      if (baseline.length > 0) {
        await prisma.ai_agents.update({
          where: { id: agent.id },
          data: { baselineActions: baseline },
        });
        count++;
      }
    }
    res.json({ success: true, data: { seeded: count } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

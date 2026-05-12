import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';
import prisma from '../config/db';

const router = Router();

/**
 * Demo Route: Simulate Attack
 * strictly for demonstration and testing purposes.
 * This route is conditionally loaded and should NOT exist in production.
 */
router.post('/simulate-attack', authenticate, authorizeRoles('ADMIN'), async (req: any, res) => {
  try {
    const organizationId = req.user.organizationId;

    // 1. Create a burst of high-risk activity logs
    const mockLogs = Array.from({ length: 15 }).map(() => ({
      organizationId,
      agent: 'External Agent (Suspicious)',
      action: 'Unauthorized Data Access Attempt',
      status: 'blocked',
      risk: 'high',
      reason: 'Heuristic pattern match for data exfiltration',
      timestamp: new Date()
    }));

    await prisma.logs.createMany({ data: mockLogs });

    // 2. Trigger critical alerts
    await prisma.alerts.create({
      data: {
        type: 'POLICY_VIOLATION',
        message: 'High-frequency brute force attempt detected on sensitive data nodes.',
        severity: 'critical',
        is_read: false,
      }
    });

    // 3. Mock a compliance drop event
    await prisma.compliance_drift.create({
      data: {
        feature_id: 'data-privacy',
        drift_percentage: 18.5,
        severity: 'high'
      }
    });

    res.status(200).json({
      success: true,
      message: 'Attack simulation initiated. Dashboard metrics will reflect a significant risk spike.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Simulation failed' });
  }
});

export default router;

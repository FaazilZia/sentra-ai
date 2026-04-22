import prisma from '../config/db';

export class DriftService {
  static async detectDrift(organizationId: string) {
    // This is a mock implementation of drift detection logic
    // In a real system, you would compare current action counts/types vs a rolling baseline
    
    const alerts: any[] = [];
    
    // Simulate finding a "New API Access" drift
    alerts.push({
      organizationId,
      agentId: 'agent-customer-support',
      type: 'new_api',
      severity: 'high',
      description: 'AI Agent "Customer Support" attempted to access unauthorized "Internal Payroll API".',
      status: 'open',
    });

    // Simulate finding a "Frequency" drift
    alerts.push({
      organizationId,
      agentId: 'agent-data-analyst',
      type: 'frequency',
      severity: 'medium',
      description: 'AI Agent "Data Analyst" performed 450 actions in 5 minutes (Baseline: 50/5min).',
      status: 'open',
    });

    // Persist alerts to DB
    for (const alert of alerts) {
      const existing = await (prisma as any).drift_alerts.findFirst({
        where: {
          organizationId,
          agentId: alert.agentId,
          type: alert.type,
          status: 'open'
        }
      });

      if (!existing) {
        await (prisma as any).drift_alerts.create({ data: alert });
      }
    }

    return await (prisma as any).drift_alerts.findMany({
      where: { organizationId, status: 'open' },
      orderBy: { timestamp: 'desc' }
    });
  }

  static async listAlerts(organizationId: string) {
    return await (prisma as any).drift_alerts.findMany({
      where: { organizationId },
      orderBy: { timestamp: 'desc' }
    });
  }

  static async resolveAlert(alertId: string, organizationId: string) {
    return await (prisma as any).drift_alerts.updateMany({
      where: { id: alertId, organizationId },
      data: { status: 'resolved' }
    });
  }
}

import prisma from '../config/db';

export class MonitoringService {
  static async updateMonitoringStatus(featureId: string, organizationId: string) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const violationsCount = await prisma.logs.count({
      where: {
        timestamp: { gte: oneDayAgo },
        status: 'blocked'
      }
    });

    let status = 'active';
    if (violationsCount > 10) status = 'critical';
    else if (violationsCount > 2) status = 'warning';

    const stability = violationsCount < 5 ? 'stable' : 'fluctuating';

    return await prisma.monitoring_status.upsert({
      where: { feature_id: featureId },
      update: {
        status,
        last_checked_at: new Date(),
        violations_last_24h: violationsCount,
        stability
      },
      create: {
        feature_id: featureId,
        organizationId,
        status,
        violations_last_24h: violationsCount,
        stability
      }
    });
  }
}

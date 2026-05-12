import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class MonitoringService {
  /**
   * Updates monitoring status for a feature based on recent activity
   */
  static async updateMonitoringStatus(featureId: string) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 1. Count violations in last 24h
    const violationsCount = await prisma.logs.count({
      where: {
        timestamp: { gte: oneDayAgo },
        status: 'blocked'
      }
    });

    // 2. Determine status
    let status = 'active';
    if (violationsCount > 10) status = 'critical';
    else if (violationsCount > 2) status = 'warning';

    // 3. Determine stability (simplified logic)
    const stability = violationsCount < 5 ? 'stable' : 'fluctuating';

    // 4. Update or create status
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
        status,
        violations_last_24h: violationsCount,
        stability
      }
    });
  }
}

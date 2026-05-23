import prisma from '../config/db';
import logger from '../utils/logger';
import { DriftScoringService } from './driftScoring.service';
import { getRedisClient } from '../config/redis';

export interface DriftScanResult {
  scannedCount: number;
  alertsCreated: number;
  alertsUpdated: number;
  message?: string;
}

export class DriftAlertService {
  /**
   * Scans AI agents for behavioral drift.
   * If driftScore > riskThreshold, creates or updates an open alert.
   */
  static async runDriftScan(organizationId?: string): Promise<DriftScanResult> {
    const redis = getRedisClient();
    const lockKey = organizationId ? `drift-scan:lock:org:${organizationId}` : null;
    let acquired = false;

    if (redis && lockKey) {
      // TTL is 10 minutes (600 seconds)
      const res = await redis.set(lockKey, 'locked', 'EX', 600, 'NX');
      if (!res) {
        logger.info(`[DRIFT ALERT] Drift scan for organization ${organizationId} was deduplicated (skipped concurrent run).`);
        return {
          scannedCount: 0,
          alertsCreated: 0,
          alertsUpdated: 0,
          message: 'Deduplicated simultaneous scan job'
        };
      }
      acquired = true;
    }

    try {
      logger.info(`[DRIFT ALERT] Starting drift scan... organizationId: ${organizationId || 'all'}`);

      // 1. Fetch agents (optionally filtered by organization)
      const agents = await prisma.ai_agents.findMany({
        where: organizationId ? { organizationId } : {},
      });

      let scannedCount = 0;
      let alertsCreated = 0;
      let alertsUpdated = 0;

      for (const agent of agents) {
        // Skip agents with empty baselineActions array to avoid alert creation
        const baseline = agent.baselineActions || [];
        if (baseline.length === 0) {
          logger.info(`[DRIFT ALERT] Skipping agent ${agent.name} (ID: ${agent.id}) due to empty baseline.`);
          continue;
        }

        scannedCount++;

        // Calculate current drift score
        const { driftScore, unexpectedActions } = await DriftScoringService.calculateDriftScore(agent.id);

        // User Rule: Rely only on driftScore > riskThreshold (do NOT check driftScore > 0)
        if (driftScore > agent.riskThreshold) {
          const message = `Agent ${agent.name} has drifted by ${Math.round(driftScore * 100)}%. Unexpected actions: ${unexpectedActions.join(', ')}`;
          const severity = driftScore >= 0.7 ? 'high' : (driftScore >= 0.4 ? 'medium' : 'low');

          // Check if an open alert already exists for this agent
          const existingAlert = await prisma.drift_alerts.findFirst({
            where: {
              agentId: agent.id,
              status: 'open',
            },
          });

          if (existingAlert) {
            // Update existing alert
            await prisma.drift_alerts.update({
              where: { id: existingAlert.id },
              data: {
                driftScore,
                unexpectedActions,
                detectedAt: new Date(),
                description: message,
                message,
                severity,
              },
            });
            alertsUpdated++;
            logger.info(`[DRIFT ALERT] Updated open alert for agent: ${agent.name} (Drift: ${Math.round(driftScore * 100)}%)`);
          } else {
            // Create new alert
            await prisma.drift_alerts.create({
              data: {
                organizationId: agent.organizationId,
                agentId: agent.id,
                type: 'BEHAVIORAL_DRIFT',
                severity,
                description: message,
                status: 'open',
                driftScore,
                unexpectedActions,
                detectedAt: new Date(),
                message,
              },
            });
            alertsCreated++;
            logger.info(`[DRIFT ALERT] Created new drift alert for agent: ${agent.name} (Drift: ${Math.round(driftScore * 100)}%)`);
          }
        }
      }

      logger.info(`[DRIFT ALERT] Drift scan finished. Scanned: ${scannedCount}, Created: ${alertsCreated}, Updated: ${alertsUpdated}`);
      return { scannedCount, alertsCreated, alertsUpdated };
    } catch (error) {
      logger.error(`[DRIFT ALERT] Drift scan failed:`, error);
      throw error;
    } finally {
      if (redis && lockKey && acquired) {
        await redis.del(lockKey);
      }
    }
  }
}

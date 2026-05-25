import prisma from '../config/db';
import logger from '../utils/logger';

export class GovernanceHealthService {
  /**
   * Register or update the health diagnostics status of a governance worker.
   */
  static async reportHealth(params: {
    workerName: string;
    queueDepth: number;
    processingLatencyMs: number;
    healthStatus: 'HEALTHY' | 'DEGRADED' | 'FAILED';
    isFailure?: boolean;
  }): Promise<any> {
    try {
      const now = new Date();
      
      // We look for an existing health row for this worker, or create a new one
      const existing = await prisma.governance_system_health.findFirst({
        where: { worker_name: params.workerName },
      });

      if (existing) {
        return await prisma.governance_system_health.update({
          where: { id: existing.id },
          data: {
            queue_depth: params.queueDepth,
            processing_latency_ms: params.processingLatencyMs,
            health_status: params.healthStatus,
            last_successful_run: params.isFailure ? undefined : now,
            last_failure: params.isFailure ? now : undefined,
          },
        });
      } else {
        return await prisma.governance_system_health.create({
          data: {
            worker_name: params.workerName,
            queue_depth: params.queueDepth,
            processing_latency_ms: params.processingLatencyMs,
            health_status: params.healthStatus,
            last_successful_run: params.isFailure ? null : now,
            last_failure: params.isFailure ? now : null,
          },
        });
      }
    } catch (err: any) {
      logger.error(`[GovernanceHealthService] Failed to report worker health: ${err.message}`);
      return null;
    }
  }

  /**
   * Retrieve all registered worker health statuses and compute an aggregated reliability score.
   */
  static async getHealthDiagnostics(): Promise<{
    workers: any[];
    overall_status: 'HEALTHY' | 'DEGRADED' | 'FAILED';
    reliability_score: number;
  }> {
    try {
      const healthLogs = await prisma.governance_system_health.findMany({
        orderBy: { worker_name: 'asc' },
      });

      if (healthLogs.length === 0) {
        return {
          workers: [],
          overall_status: 'HEALTHY',
          reliability_score: 100,
        };
      }

      let healthyCount = 0;
      let overallStatus: 'HEALTHY' | 'DEGRADED' | 'FAILED' = 'HEALTHY';
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

      healthLogs.forEach(w => {
        const isStale = w.last_successful_run && new Date(w.last_successful_run) < fourHoursAgo;
        if (w.health_status === 'HEALTHY' && !isStale) {
          healthyCount++;
        } else if (w.health_status === 'FAILED' || isStale) {
          overallStatus = 'FAILED';
        } else if (w.health_status === 'DEGRADED' && overallStatus !== 'FAILED') {
          overallStatus = 'DEGRADED';
        }
      });

      const reliabilityScore = Math.round((healthyCount / healthLogs.length) * 100);

      return {
        workers: healthLogs.map(w => ({
          id: w.id,
          worker_name: w.worker_name,
          queue_depth: w.queue_depth,
          processing_latency_ms: w.processing_latency_ms,
          last_successful_run: w.last_successful_run,
          last_failure: w.last_failure,
          health_status: w.last_successful_run && new Date(w.last_successful_run) < fourHoursAgo ? 'FAILED' : w.health_status,
          created_at: w.created_at,
        })),
        overall_status: overallStatus,
        reliability_score: reliabilityScore,
      };
    } catch (err: any) {
      logger.error(`[GovernanceHealthService] Failed to retrieve diagnostics: ${err.message}`);
      return {
        workers: [],
        overall_status: 'FAILED',
        reliability_score: 0,
      };
    }
  }
}

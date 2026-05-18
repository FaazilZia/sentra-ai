import prisma from '../config/db';
import logger from '../utils/logger';

export interface DriftScoreResult {
  driftScore: number;
  unexpectedActions: string[];
}

export class DriftScoringService {
  /**
   * Calculates the current drift score for a given AI agent based on the last 20 actions.
   * Drift Score = (number of unexpected action types in recent logs) / (total unique action types in recent logs)
   */
  static async calculateDriftScore(agentId: string): Promise<DriftScoreResult> {
    try {
      logger.info(`[DRIFT SCORING] Calculating drift score for agent: ${agentId}`);

      // 1. Fetch the agent
      const agent = await prisma.ai_agents.findUnique({
        where: { id: agentId },
      });

      if (!agent) {
        logger.error(`[DRIFT SCORING] Agent not found: ${agentId}`);
        return { driftScore: 0.0, unexpectedActions: [] };
      }

      const baseline = agent.baselineActions || [];

      // User Rule: If the agent has an empty baselineActions array, scoreDrift should return 0.
      if (baseline.length === 0) {
        logger.info(`[DRIFT SCORING] Agent ${agent.name} has an empty baseline. Skipping drift calculation.`);
        return { driftScore: 0.0, unexpectedActions: [] };
      }

      // 2. Fetch last 20 logs from logs and interception_logs models
      const logs = await prisma.logs.findMany({
        where: {
          organizationId: agent.organizationId,
          agent: agent.name,
        },
        take: 20,
        orderBy: { timestamp: 'desc' },
        select: { action: true, timestamp: true },
      });

      const interceptions = await prisma.interception_logs.findMany({
        where: {
          organizationId: agent.organizationId,
          OR: [
            { user_id: agent.id },
            { user_id: agent.name },
          ],
        },
        take: 20,
        orderBy: { timestamp: 'desc' },
        select: { metadata: true, timestamp: true },
      });

      interface UnifiedLog {
        action: string;
        timestamp: Date;
      }

      const unifiedLogs: UnifiedLog[] = [];

      for (const l of logs) {
        if (l.action && typeof l.action === 'string') {
          unifiedLogs.push({ action: l.action, timestamp: l.timestamp });
        }
      }

      for (const l of interceptions) {
        const meta = l.metadata as any;
        if (meta && typeof meta === 'object' && typeof meta.action === 'string') {
          unifiedLogs.push({ action: meta.action, timestamp: l.timestamp });
        }
      }

      // Sort descending by timestamp and slice to get top 20
      unifiedLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      const top20Logs = unifiedLogs.slice(0, 20);

      if (top20Logs.length === 0) {
        logger.info(`[DRIFT SCORING] No recent actions found for agent: ${agent.name}`);
        return { driftScore: 0.0, unexpectedActions: [] };
      }

      // Extract unique actions to identify which ones are unexpected
      const recentUniqueActions = Array.from(new Set(top20Logs.map((l) => l.action)));

      // 3. Identify unexpected actions (not in baseline)
      const unexpectedActions = recentUniqueActions.filter((act) => !baseline.includes(act));

      // 4. Calculate drift score
      // Formula: unexpectedActions.length / recentLogs.length
      const driftScore = unexpectedActions.length / top20Logs.length;

      logger.info(`[DRIFT SCORING] Agent ${agent.name} drift evaluation: Score = ${Math.round(driftScore * 100)}%, Unexpected = [${unexpectedActions.join(', ')}]`);
      return { driftScore, unexpectedActions };
    } catch (error) {
      logger.error(`[DRIFT SCORING] Failed to calculate drift score for agent ${agentId}:`, error);
      throw error;
    }
  }
}

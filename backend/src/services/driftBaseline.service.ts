import prisma from '../config/db';
import logger from '../utils/logger';

export class DriftBaselineService {
  /**
   * Computes and saves the behavioral baseline for a given AI agent.
   * Merges declared permissions with historical unique action types.
   */
  static async computeBaseline(agentId: string): Promise<string[]> {
    try {
      logger.info(`[DRIFT BASELINE] Computing behavioral baseline for agent: ${agentId}`);

      // 1. Fetch the agent
      const agent = await prisma.ai_agents.findUnique({
        where: { id: agentId },
      });

      if (!agent) {
        logger.error(`[DRIFT BASELINE] Agent not found: ${agentId}`);
        return [];
      }

      const actionSet = new Set<string>();

      // 2. Add agent's declared permissions
      if (Array.isArray(agent.permissions)) {
        for (const p of agent.permissions) {
          if (p && typeof p === 'string') {
            actionSet.add(p);
          }
        }
      }

      // 3. Sample unique actions from last 50 logs (both logs and interception_logs models)
      const recentLogs = await prisma.logs.findMany({
        where: {
          organizationId: agent.organizationId,
          agent: agent.name,
        },
        take: 50,
        orderBy: { timestamp: 'desc' },
        select: { action: true },
      });

      for (const log of recentLogs) {
        if (log.action && typeof log.action === 'string') {
          actionSet.add(log.action);
        }
      }

      const recentInterceptions = await prisma.interception_logs.findMany({
        where: {
          organizationId: agent.organizationId,
          OR: [
            { user_id: agent.id },
            { user_id: agent.name },
          ],
        },
        take: 50,
        orderBy: { timestamp: 'desc' },
        select: { metadata: true },
      });

      for (const log of recentInterceptions) {
        const meta = log.metadata as any;
        if (meta && typeof meta === 'object' && typeof meta.action === 'string') {
          actionSet.add(meta.action);
        }
      }

      const baselineActions = Array.from(actionSet);

      // 4. Derive baseline data scopes dynamically
      const scopes = new Set<string>();
      for (const act of baselineActions) {
        const lower = act.toLowerCase();
        if (lower.includes('finance') || lower.includes('budget') || lower.includes('invoice') || lower.includes('pay')) {
          scopes.add('finance-data');
        } else if (lower.includes('faq') || lower.includes('ticket') || lower.includes('support') || lower.includes('customer')) {
          scopes.add('support-data');
        } else if (lower.includes('resume') || lower.includes('interview') || lower.includes('hr') || lower.includes('employee')) {
          scopes.add('hr-data');
        } else {
          scopes.add('general-data');
        }
      }

      if (scopes.size === 0) {
        scopes.add('general-data');
      }
      const baselineDataScopes = Array.from(scopes);

      // 5. Update agent with new baseline
      await prisma.ai_agents.update({
        where: { id: agentId },
        data: {
          baselineActions,
          baselineDataScopes,
          baselineSampledAt: new Date(),
        },
      });

      logger.info(`[DRIFT BASELINE] Computed baseline for ${agent.name}: ${baselineActions.length} actions, ${baselineDataScopes.length} data scopes.`);
      return baselineActions;
    } catch (error) {
      logger.error(`[DRIFT BASELINE] Failed to compute baseline for agent ${agentId}:`, error);
      throw error;
    }
  }
}

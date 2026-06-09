import prisma from '../config/db';
import logger from '../utils/logger';

export class DriftBaselineService {
  /**
   * Computes and saves the behavioral baseline for a given AI agent.
   * Merges declared permissions with historical unique action types.
   */
  private static extractActionsFromPermissions(perms: any): Set<string> {
    const actionSet = new Set<string>();
    if (Array.isArray(perms)) {
      for (const p of perms) {
        if (typeof p === 'string' && p.trim()) actionSet.add(p.trim());
      }
    } else if (perms && typeof perms === 'object') {
      for (const [key, value] of Object.entries(perms as Record<string, any>)) {
        if (value && typeof key === 'string' && key.trim()) {
          actionSet.add(key.trim());
        }
      }
    }
    return actionSet;
  }

  private static seedActionsFromName(agentName: string): Set<string> {
    const actionSet = new Set<string>();
    const nameLower = agentName.toLowerCase();
    if (nameLower.includes('data') || nameLower.includes('analyst')) {
      actionSet.add('read_data'); actionSet.add('query_database'); actionSet.add('export_report');
    }
    if (nameLower.includes('customer') || nameLower.includes('support')) {
      actionSet.add('read_ticket'); actionSet.add('respond_ticket'); actionSet.add('escalate_ticket');
    }
    if (nameLower.includes('finance') || nameLower.includes('billing')) {
      actionSet.add('read_invoice'); actionSet.add('generate_report'); actionSet.add('query_finance');
    }
    if (nameLower.includes('code') || nameLower.includes('dev') || nameLower.includes('engineer')) {
      actionSet.add('read_code'); actionSet.add('write_code'); actionSet.add('run_tests');
    }
    actionSet.add('read_context');
    actionSet.add('generate_response');
    actionSet.add('log_action');
    return actionSet;
  }

  private static deriveDataScopes(baselineActions: string[]): Set<string> {
    const scopes = new Set<string>();
    for (const act of baselineActions) {
      const lower = act.toLowerCase();
      if (lower.includes('finance') || lower.includes('budget') || lower.includes('invoice') || lower.includes('pay')) {
        scopes.add('finance-data');
      } else if (lower.includes('faq') || lower.includes('ticket') || lower.includes('support') || lower.includes('customer')) {
        scopes.add('support-data');
      } else if (lower.includes('resume') || lower.includes('interview') || lower.includes('hr') || lower.includes('employee')) {
        scopes.add('hr-data');
      } else if (lower.includes('code') || lower.includes('test') || lower.includes('deploy')) {
        scopes.add('engineering-data');
      } else {
        scopes.add('general-data');
      }
    }
    if (scopes.size === 0) scopes.add('general-data');
    return scopes;
  }

  static async computeBaseline(agentId: string): Promise<string[]> {
    try {
      const agent = await prisma.ai_agents.findUnique({ where: { id: agentId } });
      if (!agent) {
        logger.error(`[DRIFT BASELINE] Agent not found: ${agentId}`);
        return [];
      }

      let actionSet = DriftBaselineService.extractActionsFromPermissions(agent.permissions);

      if (actionSet.size === 0) {
        actionSet = DriftBaselineService.seedActionsFromName(agent.name);
      }

      // --- Merge real historical logs if any exist ---
      const recentLogs = await prisma.logs.findMany({
        where: { organizationId: agent.organizationId, agent: agent.name },
        take: 50,
        orderBy: { timestamp: 'desc' },
        select: { action: true },
      });
      for (const log of recentLogs) {
        if (log.action && typeof log.action === 'string') actionSet.add(log.action);
      }

      const recentInterceptions = await prisma.interception_logs.findMany({
        where: {
          organizationId: agent.organizationId,
          OR: [{ user_id: agent.id }, { user_id: agent.name }],
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
      const scopes = DriftBaselineService.deriveDataScopes(baselineActions);

      // --- Persist baseline ---
      await prisma.ai_agents.update({
        where: { id: agentId },
        data: {
          baselineActions,
          baselineDataScopes: Array.from(scopes),
          baselineSampledAt: new Date(),
        },
      });

      logger.info(`[DRIFT BASELINE] Computed baseline for ${agent.name}: ${baselineActions.length} actions, ${Array.from(scopes).length} scopes.`);
      return baselineActions;
    } catch (error) {
      logger.error(`[DRIFT BASELINE] Failed to compute baseline for agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Re-computes baselines for all agents in an org that either:
   * - Have never had a baseline computed (baselineSampledAt is null), OR
   * - Have a baseline older than 24 hours AND have new logs since last sample
   */
  static async refreshStaleBaselines(organizationId: string): Promise<number> {
    try {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      
      const agents = await prisma.ai_agents.findMany({
        where: {
          organizationId,
          OR: [
            { baselineSampledAt: null },
            { baselineSampledAt: { lt: cutoff } },
          ],
        },
      });

      let refreshed = 0;
      for (const agent of agents) {
        try {
          await DriftBaselineService.computeBaseline(agent.id);
          refreshed++;
        } catch (err) {
          logger.error(`[DRIFT BASELINE] Failed to refresh baseline for agent ${agent.name}:`, err);
        }
      }

      logger.info(`[DRIFT BASELINE] Refreshed ${refreshed} stale baselines for org ${organizationId}`);
      return refreshed;
    } catch (error) {
      logger.error(`[DRIFT BASELINE] Stale baselines refresh sweep failed for org ${organizationId}:`, error);
      throw error;
    }
  }
}

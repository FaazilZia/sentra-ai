import prisma from '../config/db';
import { DriftBaselineService } from './driftBaseline.service';
import { QuantitativeRiskService } from './quantitativeRisk.service';
import logger from '../utils/logger';

export class InventoryService {
  static async listAgents(organizationId: string) {
    return await prisma.ai_agents.findMany({
      where: { organizationId },
      include: {
        dependencies: true,
      },
    });
  }

  static async getAgent(id: string, organizationId: string) {
    return await prisma.ai_agents.findFirst({
      where: { id, organizationId },
      include: {
        dependencies: true,
      },
    });
  }

  static async createAgent(organizationId: string, data: any) {
    const { name, model, permissions, status, dependencies } = data;
    
    const agent = await prisma.ai_agents.create({
      data: {
        organizationId,
        name,
        model,
        permissions,
        status,
        dependencies: {
          create: dependencies || [],
        },
      },
    });

    // Compute baseline immediately on registration
    try {
      const baseline = await DriftBaselineService.computeBaseline(agent.id);
      await prisma.ai_agents.update({
        where: { id: agent.id },
        data: { baselineActions: baseline },
      });
    } catch (error) {
      logger.error(`[INVENTORY] Failed to compute baseline for newly registered agent ${agent.id}:`, error);
    }

    // Initialize default risk scores
    try {
      await QuantitativeRiskService.updateRiskScore(
        organizationId,
        agent.id,
        30,
        30,
        'Initial registration auto-calculation',
        'system'
      );
    } catch (error) {
      logger.error(`[INVENTORY] Failed to initialize risk score for registered agent ${agent.id}:`, error);
    }

    return agent;
  }

  static async updateAgent(id: string, organizationId: string, data: any) {
    const { name, model, permissions, status } = data;

    // Handle dependency updates separately or using nested writes if supported
    // For MVP, we'll just update the main agent fields
    return await prisma.ai_agents.update({
      where: { id },
      data: {
        name,
        model,
        permissions,
        status,
      },
    });
  }

  static async deleteAgent(id: string, organizationId: string) {
    return await prisma.ai_agents.deleteMany({
      where: { id, organizationId },
    });
  }

  static async getAgentDependencies(agentId: string) {
    return await prisma.ai_dependencies.findMany({
      where: { agentId },
    });
  }
}

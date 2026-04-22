import prisma from '../config/db';

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
    
    return await prisma.ai_agents.create({
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
  }

  static async updateAgent(id: string, organizationId: string, data: any) {
    const { name, model, permissions, status, dependencies } = data;

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

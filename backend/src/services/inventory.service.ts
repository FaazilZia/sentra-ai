import prisma from '../config/db';

export class InventoryService {
  static async listAgents(companyId: string) {
    return await prisma.ai_agents.findMany({
      where: { companyId },
      include: {
        dependencies: true,
      },
    });
  }

  static async getAgent(id: string, companyId: string) {
    return await prisma.ai_agents.findFirst({
      where: { id, companyId },
      include: {
        dependencies: true,
      },
    });
  }

  static async createAgent(companyId: string, data: any) {
    const { name, model, permissions, status, dependencies } = data;
    
    return await prisma.ai_agents.create({
      data: {
        companyId,
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

  static async updateAgent(id: string, companyId: string, data: any) {
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

  static async deleteAgent(id: string, companyId: string) {
    return await prisma.ai_agents.deleteMany({
      where: { id, companyId },
    });
  }

  static async getAgentDependencies(agentId: string) {
    return await prisma.ai_dependencies.findMany({
      where: { agentId },
    });
  }
}

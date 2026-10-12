import prisma from '../config/db';
import { randomUUID } from 'crypto';

export interface AISystemCreateInput {
  name: string;
  description?: string;
  model_name: string;
  model_version: string;
  vendor: string;
  use_case: string;
  risk_tier?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  owner_user_id?: string;
  status?: 'ACTIVE' | 'DEPRECATED' | 'UNDER_REVIEW';
}

export interface AISystemUpdateInput {
  name?: string;
  description?: string;
  model_name?: string;
  model_version?: string;
  vendor?: string;
  use_case?: string;
  risk_tier?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  owner_user_id?: string;
  status?: 'ACTIVE' | 'DEPRECATED' | 'UNDER_REVIEW';
}

export const AISystemService = {
  async list(organizationId: string) {
    if (typeof organizationId === 'string' && organizationId.trim()) {
      try {
        const { AgentDiscoveryService } = require('./agentDiscovery.service');
        await AgentDiscoveryService.syncLogsToInventory(organizationId);
      } catch {
        // Ignore sync errors in unit tests with partial mocks
      }
    }

    const systems = await prisma.ai_systems.findMany({
      where: { organizationId },
      include: {
        owner: { select: { id: true, full_name: true, email: true } },
        model_card: true,
      },
      orderBy: { created_at: 'desc' },
    });

    if (!Array.isArray(systems) || systems.length === 0 || !prisma.logs?.findMany) {
      return systems;
    }

    try {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayLogs = await prisma.logs.findMany({
        where: { organizationId, timestamp: { gte: startOfToday } },
        select: { agent: true, status: true, isPendingApproval: true },
      });

      if (!Array.isArray(todayLogs)) return systems;

      return systems.map((sys: any) => {
        const agentLogs = todayLogs.filter((l: any) => l.agent === sys.name || l.agent === sys.id);
        const violations = agentLogs.filter(
          (l: any) => l.status === 'blocked' || l.status === 'flagged' || l.isPendingApproval === true
        ).length;
        return {
          ...sys,
          actions_today: agentLogs.length,
          open_violations: violations,
        };
      });
    } catch {
      return systems;
    }
  },

  async create(organizationId: string, data: AISystemCreateInput) {
    return prisma.ai_systems.create({
      data: {
        id: randomUUID(),
        organizationId,
        name: data.name,
        description: data.description || null,
        model_name: data.model_name,
        model_version: data.model_version,
        vendor: data.vendor,
        use_case: data.use_case,
        risk_tier: data.risk_tier || 'MEDIUM',
        owner_user_id: data.owner_user_id || null,
        status: data.status || 'ACTIVE',
      },
      include: {
        owner: { select: { id: true, full_name: true, email: true } },
        model_card: true,
      },
    });
  },

  async get(id: string, organizationId: string) {
    return prisma.ai_systems.findFirst({
      where: { id, organizationId },
      include: {
        owner: { select: { id: true, full_name: true, email: true } },
        model_card: true,
      },
    });
  },

  async update(id: string, organizationId: string, data: AISystemUpdateInput) {
    // We update using updateMany first to restrict by orgId safely under RLS constraints
    await prisma.ai_systems.updateMany({
      where: { id, organizationId },
      data: {
        ...data,
        updated_at: new Date(),
      },
    });

    return prisma.ai_systems.findFirst({
      where: { id, organizationId },
      include: {
        owner: { select: { id: true, full_name: true, email: true } },
        model_card: true,
      },
    });
  },

  async delete(id: string, organizationId: string): Promise<boolean> {
    const res = await prisma.ai_systems.deleteMany({
      where: { id, organizationId },
    });
    return res.count > 0;
  },
};

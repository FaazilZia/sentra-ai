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
    return prisma.ai_systems.findMany({
      where: { organizationId },
      include: {
        owner: { select: { id: true, full_name: true, email: true } },
        model_card: true,
      },
      orderBy: { created_at: 'desc' },
    });
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

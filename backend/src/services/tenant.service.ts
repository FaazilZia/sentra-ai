import { randomUUID } from 'crypto';
import * as crypto from 'crypto';
import prisma from '../config/db';
import logger from '../utils/logger';
import { auditLogger } from '../utils/auditLogger';
import { seedOrganizationGovernance } from './governanceSeed.service';

// ─────────────────────────────────────────────
// Tenant Context
// ─────────────────────────────────────────────

export interface TenantContext {
  organizationId: string;
  workspaceId?: string;
  userId: string;
  role: string;
  permissions: string[];
}

export async function resolveTenantContext(req: any): Promise<TenantContext | null> {
  if (!req.user?.organizationId) return null;

  const workspaceId = req.headers['x-workspace-id'] as string | undefined;

  // Validate workspace belongs to org if provided
  if (workspaceId) {
    const ws = await prisma.workspaces.findFirst({
      where: { id: workspaceId, organizationId: req.user.organizationId, is_active: true },
    });
    if (!ws) return null;
  }

  return {
    organizationId: req.user.organizationId,
    workspaceId,
    userId: req.user.id,
    role: req.user.role,
    permissions: req.user.permissions || [],
  };
}

// ─────────────────────────────────────────────
// Organization
// ─────────────────────────────────────────────

export const TenantService = {
  async createOrganization(params: {
    name: string;
    slug: string;
    ownerId?: string;
    plan?: string;
  }) {
    const org = await prisma.$transaction(async (tx) => {
      const createdOrg = await tx.organizations.create({
        data: {
          id: randomUUID(),
          name: params.name,
          slug: params.slug,
          is_active: true,
          plan: params.plan || 'free',
        },
      });

      // Create default workspace
      await tx.workspaces.create({
        data: {
          id: randomUUID(),
          organizationId: createdOrg.id,
          name: 'Default',
          slug: 'default',
          is_default: true,
          is_active: true,
        },
      });

      // Seed default org settings
      await tx.org_settings.create({
        data: {
          organizationId: createdOrg.id,
          mfa_required: false,
          session_timeout_minutes: 1440,
          data_retention_days: 90,
          audit_export_enabled: true,
        },
      });

      // Seed baseline controls and obligations
      await seedOrganizationGovernance(createdOrg.id, tx);

      return createdOrg;
    }, { timeout: 35000 });

    logger.info(`[TenantService] Created org ${org.slug} (${org.id}) and seeded governance frameworks`);
    return org;
  },

  async getOrganization(organizationId: string) {
    return prisma.organizations.findUnique({
      where: { id: organizationId },
      include: { org_settings: true, workspaces: true },
    });
  },

  async updateOrganization(organizationId: string, data: {
    name?: string;
    alertEmail?: string;
    slackWebhookUrl?: string;
    plan?: string;
  }) {
    return prisma.organizations.update({
      where: { id: organizationId },
      data: { ...data, updated_at: new Date() },
    });
  },

  // ─────────────────────────────────────────────
  // Workspaces
  // ─────────────────────────────────────────────

  async listWorkspaces(organizationId: string) {
    return prisma.workspaces.findMany({
      where: { organizationId, is_active: true },
      include: { memberships: { include: { user: { select: { id: true, full_name: true, email: true } } } } },
      orderBy: [{ is_default: 'desc' }, { created_at: 'asc' }],
    });
  },

  async createWorkspace(organizationId: string, params: {
    name: string;
    slug: string;
    description?: string;
  }) {
    // Check workspace limit
    const org = await prisma.organizations.findUnique({ where: { id: organizationId } });
    const currentCount = await prisma.workspaces.count({ where: { organizationId, is_active: true } });
    if (org && currentCount >= org.max_workspaces) {
      throw new Error(`Workspace limit (${org.max_workspaces}) reached for this plan.`);
    }

    // Validate slug uniqueness within org
    const existing = await prisma.workspaces.findUnique({
      where: { organizationId_slug: { organizationId, slug: params.slug } },
    });
    if (existing) throw new Error(`Workspace slug "${params.slug}" already exists.`);

    return prisma.workspaces.create({
      data: {
        id: randomUUID(),
        organizationId,
        name: params.name,
        slug: params.slug,
        description: params.description,
        is_default: false,
        is_active: true,
      },
    });
  },

  async updateWorkspace(organizationId: string, workspaceId: string, data: {
    name?: string;
    description?: string;
  }) {
    const ws = await prisma.workspaces.findFirst({
      where: { id: workspaceId, organizationId },
    });
    if (!ws) throw new Error('Workspace not found or access denied');

    return prisma.workspaces.update({
      where: { id: workspaceId },
      data: { ...data, updated_at: new Date() },
    });
  },

  async deleteWorkspace(organizationId: string, workspaceId: string) {
    const ws = await prisma.workspaces.findFirst({
      where: { id: workspaceId, organizationId },
    });
    if (!ws) throw new Error('Workspace not found');
    if (ws.is_default) throw new Error('Cannot delete the default workspace');

    return prisma.workspaces.update({
      where: { id: workspaceId },
      data: { is_active: false, updated_at: new Date() },
    });
  },

  async addWorkspaceMember(workspaceId: string, userId: string, role: string = 'MEMBER') {
    return prisma.workspace_memberships.upsert({
      where: { workspaceId_userId: { workspaceId, userId } },
      create: { id: randomUUID(), workspaceId, userId, role },
      update: { role },
    });
  },

  async removeWorkspaceMember(workspaceId: string, userId: string) {
    return prisma.workspace_memberships.delete({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
  },

  // ─────────────────────────────────────────────
  // Invitations
  // ─────────────────────────────────────────────

  async inviteUser(params: {
    organizationId: string;
    email: string;
    role: string;
    invitedBy: string;
  }) {
    // Check if user already in org
    const existingUser = await prisma.users.findFirst({
      where: { email: params.email, organizationId: params.organizationId },
    });
    if (existingUser) throw new Error('User already belongs to this organization');

    // Check for existing pending invite
    const existing = await prisma.org_invitations.findFirst({
      where: {
        organizationId: params.organizationId,
        email: params.email,
        accepted_at: null,
        expires_at: { gt: new Date() },
      },
    });
    if (existing) throw new Error('An active invitation already exists for this email');

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await prisma.org_invitations.create({
      data: {
        id: randomUUID(),
        organizationId: params.organizationId,
        email: params.email,
        role: params.role,
        token,
        expires_at: expiresAt,
        invited_by: params.invitedBy,
      },
    });

    logger.info(`[TenantService] Invitation created for ${params.email} → org ${params.organizationId}`);
    return invitation;
  },

  async getInvitation(token: string) {
    return prisma.org_invitations.findUnique({
      where: { token },
      include: { organization: { select: { id: true, name: true, slug: true } } },
    });
  },

  async acceptInvitation(token: string, userId: string) {
    const invitation = await prisma.org_invitations.findUnique({ where: { token } });
    if (!invitation) throw new Error('Invitation not found');
    if (invitation.accepted_at) throw new Error('Invitation already used');
    if (invitation.expires_at < new Date()) throw new Error('Invitation has expired');

    // Accept: update user org + invitation
    await prisma.$transaction(async (tx) => {
      // Move user to invited org
      await tx.users.update({
        where: { id: userId },
        data: { organizationId: invitation.organizationId, role: invitation.role },
      });

      // Mark accepted
      await tx.org_invitations.update({
        where: { token },
        data: { accepted_at: new Date() },
      });

      // Add to default workspace
      const defaultWs = await tx.workspaces.findFirst({
        where: { organizationId: invitation.organizationId, is_default: true },
      });
      if (defaultWs) {
        await tx.workspace_memberships.upsert({
          where: { workspaceId_userId: { workspaceId: defaultWs.id, userId } },
          create: { id: randomUUID(), workspaceId: defaultWs.id, userId, role: invitation.role },
          update: { role: invitation.role },
        });
      }
    });

    logger.info(`[TenantService] Invitation accepted by user ${userId}`);
    return invitation;
  },

  async listInvitations(organizationId: string) {
    return prisma.org_invitations.findMany({
      where: { organizationId },
      orderBy: { created_at: 'desc' },
    });
  },

  async revokeInvitation(organizationId: string, invitationId: string) {
    const inv = await prisma.org_invitations.findFirst({
      where: { id: invitationId, organizationId },
    });
    if (!inv) throw new Error('Invitation not found');

    // Mark as accepted (effectively invalidating) with current timestamp
    return prisma.org_invitations.update({
      where: { id: invitationId },
      data: { accepted_at: new Date() },
    });
  },

  // ─────────────────────────────────────────────
  // Org Settings
  // ─────────────────────────────────────────────

  async getOrgSettings(organizationId: string) {
    return prisma.org_settings.findUnique({
      where: { organizationId },
    });
  },

  async updateOrgSettings(organizationId: string, data: {
    mfa_required?: boolean;
    session_timeout_minutes?: number;
    allowed_ip_ranges?: string[];
    data_retention_days?: number;
    audit_export_enabled?: boolean;
    logo_url?: string;
    primary_color?: string;
    webhook_url?: string;
    webhook_events?: string[];
  }) {
    return prisma.org_settings.upsert({
      where: { organizationId },
      create: { organizationId, ...data },
      update: { ...data },
    });
  },
};

import bcrypt from 'bcrypt';
import prisma from '../config/db';
import { randomUUID } from 'crypto';
import { Response } from 'express';
import nodemailer from 'nodemailer';
import { TenantService } from '../services/tenant.service';
import { auditLogger } from '../utils/auditLogger';
import { asyncHandler, sendSuccess, sendError, getOrgId } from '../utils/controllerHelpers';
import logger from '../utils/logger';

// ─────────────────────────────────────────────
// Workspace Controllers
// ─────────────────────────────────────────────

export const listWorkspaces = asyncHandler(async (req: any, res: Response) => {
  const workspaces = await TenantService.listWorkspaces(getOrgId(req));
  return sendSuccess(res, workspaces);
});

export const createWorkspace = asyncHandler(async (req: any, res: Response) => {
  const { name, slug, description } = req.body;
  const orgId = getOrgId(req);
  try {
    const ws = await TenantService.createWorkspace(orgId, { name, slug, description });

    await auditLogger.log({
      organizationId: orgId,
      userId: req.user.id,
      action: 'WORKSPACE_CREATED',
      resourceType: 'workspace',
      resourceId: ws.id,
      eventType: 'GOVERNANCE',
      metadata: { name, slug },
    });

    return sendSuccess(res, ws, 201);
  } catch (e: any) {
    if (e.message?.includes('limit') || e.message?.includes('already exists')) {
      return sendError(res, 400, e.message);
    }
    throw e;
  }
});

export const updateWorkspace = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const orgId = getOrgId(req);
  try {
    const ws = await TenantService.updateWorkspace(orgId, id, req.body);
    return sendSuccess(res, ws);
  } catch (e: any) {
    if (e.message === 'Workspace not found or access denied') {
      return sendError(res, 404, e.message);
    }
    throw e;
  }
});

export const deleteWorkspace = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const orgId = getOrgId(req);
  try {
    await TenantService.deleteWorkspace(orgId, id);

    await auditLogger.log({
      organizationId: orgId,
      userId: req.user.id,
      action: 'WORKSPACE_DELETED',
      resourceType: 'workspace',
      resourceId: id,
      eventType: 'GOVERNANCE',
    });

    return sendSuccess(res, undefined, 200, 'Workspace deactivated');
  } catch (e: any) {
    if (e.message?.includes('not found') || e.message?.includes('default')) {
      return sendError(res, 400, e.message);
    }
    throw e;
  }
});

// ─────────────────────────────────────────────
// Invitation Controllers
// ─────────────────────────────────────────────

export const inviteUser = asyncHandler(async (req: any, res: Response) => {
  const { email, role } = req.body;
  const orgId = getOrgId(req);
  try {
    const invitation = await TenantService.inviteUser({
      organizationId: orgId,
      email,
      role: role || 'VIEWER',
      invitedBy: req.user.id,
    });

    await auditLogger.log({
      organizationId: orgId,
      userId: req.user.id,
      action: 'USER_INVITED',
      resourceType: 'invitation',
      resourceId: invitation.id,
      eventType: 'USER_ACTION',
      metadata: { email, role },
    });

    // Send invitation email via nodemailer
    try {
      if (process.env.SMTP_HOST) {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number.parseInt(process.env.SMTP_PORT || '587', 10),
          secure: process.env.SMTP_PORT === '465',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        const org = await TenantService.getOrganization(orgId);
        const orgName = org?.name || 'Sentraa AI';
        // Sanitize user-controlled tenant name to prevent HTML injection in email template
        const sanitizedOrgName = orgName
          .replaceAll('&', '&amp;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;')
          .replaceAll('"', '&quot;')
          .replaceAll("'", '&#039;');
        const safeSubjectOrgName = orgName.replaceAll(/[\r\n]/g, '');
        // System-generated link: FRONTEND_URL + 64-char crypto hex token (safe against injection)
        const joinLink = `${(process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0]}/accept-invite?token=${invitation.token}`;

        await transporter.sendMail({
          from: process.env.SMTP_FROM || '"Sentraa AI" <noreply@sentraatech.com>',
          to: email,
          subject: `You've been invited to join ${safeSubjectOrgName} on Sentraa AI`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
              <h2 style="color: #0f172a; margin-top: 0;">You've been invited!</h2>
              <p>You have been invited to join <strong>${sanitizedOrgName}</strong> on Sentraa AI.</p>
              <p>Click the link below to accept the invitation and set up your account:</p>
              <p style="margin: 24px 0;">
                <a href="${joinLink}" style="display: inline-block; background: #0f172a; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Accept Invitation</a>
              </p>
              <p style="font-size: 12px; color: #64748b;">
                Or copy and paste this URL into your browser: <br/>
                <a href="${joinLink}" style="color: #0284c7;">${joinLink}</a>
              </p>
              <p style="font-size: 12px; color: #94a3b8; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
                This invitation was sent by Sentraa AI Governance Platform.
              </p>
            </div>
          `
        });
        logger.info(`[TenantController] Invitation email sent to ${String(email).substring(0, 50).replaceAll(/[^\w@.+-]/g, '')}`);
      } else {
        logger.warn('[TenantController] SMTP_HOST not provided. Email invitation was not sent.');
      }
    } catch (emailError: any) {
      logger.error('[TenantController] Failed to send invitation email:', emailError.message || emailError);
    }

    return sendSuccess(res, {
      success: true,
      message: `Invitation sent to ${email}`,
      data: { id: invitation.id, email: invitation.email, token: invitation.token, expires_at: invitation.expires_at },
    }, 201);
  } catch (e: any) {
    if (e.message?.includes('already') || e.message?.includes('active invitation')) {
      return sendError(res, 409, e.message);
    }
    throw e;
  }
});

export const listInvitations = asyncHandler(async (req: any, res: Response) => {
  const invitations = await TenantService.listInvitations(getOrgId(req));
  return sendSuccess(res, invitations);
});

export const acceptInvitation = asyncHandler(async (req: any, res: Response) => {
  const { token } = req.params;
  try {
    const invitation = await TenantService.getInvitation(token);

    if (!invitation) return sendError(res, 404, 'Invitation not found');
    if (invitation.accepted_at) return sendError(res, 410, 'Invitation already used');
    if (invitation.expires_at < new Date()) return sendError(res, 410, 'Invitation expired');

    await TenantService.acceptInvitation(token, req.user.id);

    return sendSuccess(res, {
      success: true,
      message: `Joined ${invitation.organization.name} successfully`,
      data: { organizationId: invitation.organizationId, organizationName: invitation.organization.name },
    });
  } catch (e: any) {
    if (e.message?.includes('expired') || e.message?.includes('already used')) {
      return sendError(res, 410, e.message);
    }
    throw e;
  }
});

export const revokeInvitation = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  await TenantService.revokeInvitation(getOrgId(req), id);
  return sendSuccess(res, undefined, 200, 'Invitation revoked');
});

export const getInvitationInfo = asyncHandler(async (req: any, res: Response) => {
  const { token } = req.params;
  const invitation = await TenantService.getInvitation(token);
  if (!invitation) return sendError(res, 404, 'Invitation not found');

  return sendSuccess(res, {
    email: invitation.email,
    role: invitation.role,
    organization: invitation.organization,
    expires_at: invitation.expires_at,
    valid: !invitation.accepted_at && invitation.expires_at > new Date(),
  });
});

// ─────────────────────────────────────────────
// Org Settings Controllers
// ─────────────────────────────────────────────

export const getOrgSettings = asyncHandler(async (req: any, res: Response) => {
  const settings = await TenantService.getOrgSettings(getOrgId(req));
  return sendSuccess(res, settings);
});

export const updateOrgSettings = asyncHandler(async (req: any, res: Response) => {
  const orgId = getOrgId(req);
  const settings = await TenantService.updateOrgSettings(orgId, req.body);

  await auditLogger.log({
    organizationId: orgId,
    userId: req.user.id,
    action: 'ORG_SETTINGS_UPDATED',
    resourceType: 'org_settings',
    eventType: 'GOVERNANCE',
    metadata: req.body,
  });

  return sendSuccess(res, settings);
});

export const getInviteVerify = asyncHandler(async (req: any, res: Response) => {
  const token = req.query.token as string;
  if (!token) {
    return sendError(res, 400, 'Token query parameter is required');
  }

  const invitation = await TenantService.getInvitation(token);
  if (!invitation) {
    return sendError(res, 404, 'Invitation not found');
  }

  if (invitation.accepted_at) {
    return sendError(res, 410, 'Invitation already used');
  }

  if (invitation.expires_at < new Date()) {
    return sendError(res, 410, 'Invitation expired');
  }

  return sendSuccess(res, {
    email: invitation.email,
    role: invitation.role,
    organizationName: invitation.organization.name,
    expires_at: invitation.expires_at,
  });
});

export const acceptInviteAndRegister = asyncHandler(async (req: any, res: Response) => {
  const { token, name, password } = req.body;
  if (!token || !name || !password) {
    return sendError(res, 400, 'Token, name, and password are required');
  }

  const invitation = await TenantService.getInvitation(token);
  if (!invitation) {
    return sendError(res, 404, 'Invitation not found');
  }

  if (invitation.accepted_at) {
    return sendError(res, 410, 'Invitation already used');
  }

  if (invitation.expires_at < new Date()) {
    return sendError(res, 410, 'Invitation expired');
  }

  // Check if user already exists
  const userExists = await prisma.users.findUnique({
    where: { email: invitation.email }
  });
  if (userExists) {
    return sendError(res, 409, 'A user with this email already exists');
  }

  const password_hash = await bcrypt.hash(password, 10);
  const userId = randomUUID();

  await prisma.$transaction(async (tx) => {
    // Create new user
    await tx.users.create({
      data: {
        id: userId,
        organizationId: invitation.organizationId,
        email: invitation.email,
        full_name: name,
        password_hash,
        role: invitation.role,
        is_active: true,
      }
    });

    // Mark invitation accepted
    await tx.org_invitations.update({
      where: { token },
      data: { accepted_at: new Date() },
    });

    // Add to default workspace
    const defaultWs = await tx.workspaces.findFirst({
      where: { organizationId: invitation.organizationId, is_default: true },
    });
    if (defaultWs) {
      await tx.workspace_memberships.create({
        data: {
          id: randomUUID(),
          workspaceId: defaultWs.id,
          userId,
          role: invitation.role,
        }
      });
    }
  });

  await auditLogger.log({
    organizationId: invitation.organizationId,
    userId,
    action: 'USER_REGISTERED_INVITE',
    resourceType: 'user',
    resourceId: userId,
    eventType: 'USER_ACTION',
  });

  return sendSuccess(res, { success: true, message: 'Account created successfully' }, 201);
});

export const getAidrEnforcementModeController = asyncHandler(async (req: any, res: Response) => {
  const orgId = getOrgId(req);
  const org = await prisma.organizations.findUnique({
    where: { id: orgId },
    select: { aidrEnforcementMode: true }
  });
  return sendSuccess(res, { mode: org?.aidrEnforcementMode || 'BLOCK' });
});

export const updateAidrEnforcementModeController = asyncHandler(async (req: any, res: Response) => {
  const orgId = getOrgId(req);
  const { mode } = req.body;

  if (!['FLAG_ONLY', 'BLOCK'].includes(mode)) {
    return sendError(res, 400, 'Invalid mode. Must be FLAG_ONLY or BLOCK.');
  }

  const existingOrg = await prisma.organizations.findUnique({
    where: { id: orgId },
    select: { aidrEnforcementMode: true }
  });

  const previousMode = existingOrg?.aidrEnforcementMode || 'BLOCK';

  const updatedOrg = await prisma.organizations.update({
    where: { id: orgId },
    data: { aidrEnforcementMode: mode },
    select: { id: true, aidrEnforcementMode: true }
  });

  await auditLogger.log({
    organizationId: orgId,
    userId: req.user?.id || 'system',
    action: 'UPDATE_AIDR_ENFORCEMENT_MODE',
    resourceType: 'organizations',
    eventType: 'SECURITY',
    metadata: { previousMode, newMode: mode, updatedBy: req.user?.id || req.user?.email || 'system' }
  });

  return sendSuccess(res, { mode: updatedOrg.aidrEnforcementMode, previousMode });
});

import { Response } from 'express';
import nodemailer from 'nodemailer';
import { TenantService } from '../services/tenant.service';
import { auditLogger } from '../utils/auditLogger';
import { asyncHandler, sendSuccess, sendError, getOrgId } from '../utils/controllerHelpers';

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
        const orgName = org?.name || 'Sentra AI';
        const joinLink = `${process.env.FRONTEND_URL}/accept-invite?token=${invitation.token}`;

        await transporter.sendMail({
          from: process.env.SMTP_FROM || '"Sentra AI" <noreply@sentra.ai>',
          to: email,
          subject: `You've been invited to join ${orgName} on Sentra AI`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
              <h2 style="color: #0f172a; margin-top: 0;">You've been invited!</h2>
              <p>You have been invited to join <strong>${orgName}</strong> on Sentra AI.</p>
              <p>Click the link below to accept the invitation and set up your account:</p>
              <p style="margin: 24px 0;">
                <a href="${joinLink}" style="display: inline-block; background: #0f172a; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Accept Invitation</a>
              </p>
              <p style="font-size: 12px; color: #64748b;">
                Or copy and paste this URL into your browser: <br/>
                <a href="${joinLink}" style="color: #0284c7;">${joinLink}</a>
              </p>
              <p style="font-size: 12px; color: #94a3b8; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
                This invitation was sent by Sentra AI Governance Platform.
              </p>
            </div>
          `
        });
        console.log(`[TenantController] Invitation email sent to ${String(email).substring(0, 50).replace(/[^\w@.+-]/g, '')}`);
      } else {
        console.warn('[TenantController] SMTP_HOST not provided. Email invitation was not sent.');
      }
    } catch (emailError: any) {
      console.error('[TenantController] Failed to send invitation email:', emailError.message || emailError);
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

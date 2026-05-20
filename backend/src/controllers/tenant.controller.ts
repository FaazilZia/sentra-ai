import { Request, Response, NextFunction } from 'express';
import { TenantService } from '../services/tenant.service';
import { auditLogger } from '../utils/auditLogger';

// ─────────────────────────────────────────────
// Workspace Controllers
// ─────────────────────────────────────────────

export const listWorkspaces = async (req: any, res: Response, next: NextFunction) => {
  try {
    const workspaces = await TenantService.listWorkspaces(req.user.organizationId);
    res.json({ success: true, data: workspaces });
  } catch (e) { next(e); }
};

export const createWorkspace = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { name, slug, description } = req.body;
    const ws = await TenantService.createWorkspace(req.user.organizationId, { name, slug, description });

    await auditLogger.log({
      organizationId: req.user.organizationId,
      userId: req.user.id,
      action: 'WORKSPACE_CREATED',
      resourceType: 'workspace',
      resourceId: ws.id,
      eventType: 'GOVERNANCE',
      metadata: { name, slug },
    });

    res.status(201).json({ success: true, data: ws });
  } catch (e: any) {
    if (e.message?.includes('limit') || e.message?.includes('already exists')) {
      return res.status(400).json({ success: false, message: e.message });
    }
    next(e);
  }
};

export const updateWorkspace = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const ws = await TenantService.updateWorkspace(req.user.organizationId, id, req.body);
    res.json({ success: true, data: ws });
  } catch (e: any) {
    if (e.message === 'Workspace not found or access denied') return res.status(404).json({ success: false, message: e.message });
    next(e);
  }
};

export const deleteWorkspace = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await TenantService.deleteWorkspace(req.user.organizationId, id);

    await auditLogger.log({
      organizationId: req.user.organizationId,
      userId: req.user.id,
      action: 'WORKSPACE_DELETED',
      resourceType: 'workspace',
      resourceId: id,
      eventType: 'GOVERNANCE',
    });

    res.json({ success: true, message: 'Workspace deactivated' });
  } catch (e: any) {
    if (e.message?.includes('not found') || e.message?.includes('default')) {
      return res.status(400).json({ success: false, message: e.message });
    }
    next(e);
  }
};

// ─────────────────────────────────────────────
// Invitation Controllers
// ─────────────────────────────────────────────

export const inviteUser = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { email, role } = req.body;
    const invitation = await TenantService.inviteUser({
      organizationId: req.user.organizationId,
      email,
      role: role || 'VIEWER',
      invitedBy: req.user.id,
    });

    await auditLogger.log({
      organizationId: req.user.organizationId,
      userId: req.user.id,
      action: 'USER_INVITED',
      resourceType: 'invitation',
      resourceId: invitation.id,
      eventType: 'USER_ACTION',
      metadata: { email, role },
    });

    // TODO: Send invitation email via nodemailer
    res.status(201).json({
      success: true,
      message: `Invitation sent to ${email}`,
      data: { id: invitation.id, email: invitation.email, token: invitation.token, expires_at: invitation.expires_at },
    });
  } catch (e: any) {
    if (e.message?.includes('already') || e.message?.includes('active invitation')) {
      return res.status(409).json({ success: false, message: e.message });
    }
    next(e);
  }
};

export const listInvitations = async (req: any, res: Response, next: NextFunction) => {
  try {
    const invitations = await TenantService.listInvitations(req.user.organizationId);
    res.json({ success: true, data: invitations });
  } catch (e) { next(e); }
};

export const acceptInvitation = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;
    const invitation = await TenantService.getInvitation(token);

    if (!invitation) return res.status(404).json({ success: false, message: 'Invitation not found' });
    if (invitation.accepted_at) return res.status(410).json({ success: false, message: 'Invitation already used' });
    if (invitation.expires_at < new Date()) return res.status(410).json({ success: false, message: 'Invitation expired' });

    await TenantService.acceptInvitation(token, req.user.id);

    res.json({
      success: true,
      message: `Joined ${invitation.organization.name} successfully`,
      data: { organizationId: invitation.organizationId, organizationName: invitation.organization.name },
    });
  } catch (e: any) {
    if (e.message?.includes('expired') || e.message?.includes('already used')) {
      return res.status(410).json({ success: false, message: e.message });
    }
    next(e);
  }
};

export const revokeInvitation = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await TenantService.revokeInvitation(req.user.organizationId, id);
    res.json({ success: true, message: 'Invitation revoked' });
  } catch (e) { next(e); }
};

export const getInvitationInfo = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;
    const invitation = await TenantService.getInvitation(token);
    if (!invitation) return res.status(404).json({ success: false, message: 'Invitation not found' });

    res.json({
      success: true,
      data: {
        email: invitation.email,
        role: invitation.role,
        organization: invitation.organization,
        expires_at: invitation.expires_at,
        valid: !invitation.accepted_at && invitation.expires_at > new Date(),
      },
    });
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────
// Org Settings Controllers
// ─────────────────────────────────────────────

export const getOrgSettings = async (req: any, res: Response, next: NextFunction) => {
  try {
    const settings = await TenantService.getOrgSettings(req.user.organizationId);
    res.json({ success: true, data: settings });
  } catch (e) { next(e); }
};

export const updateOrgSettings = async (req: any, res: Response, next: NextFunction) => {
  try {
    const settings = await TenantService.updateOrgSettings(req.user.organizationId, req.body);

    await auditLogger.log({
      organizationId: req.user.organizationId,
      userId: req.user.id,
      action: 'ORG_SETTINGS_UPDATED',
      resourceType: 'org_settings',
      eventType: 'GOVERNANCE',
      metadata: req.body,
    });

    res.json({ success: true, data: settings });
  } catch (e) { next(e); }
};

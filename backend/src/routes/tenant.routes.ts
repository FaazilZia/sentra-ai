import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requirePermission, requireRole } from '../services/rbac.service';
import {
  listWorkspaces, createWorkspace, updateWorkspace, deleteWorkspace,
  inviteUser, listInvitations, acceptInvitation, revokeInvitation, getInvitationInfo,
  getOrgSettings, updateOrgSettings,
} from '../controllers/tenant.controller';

const router = Router();

// All routes require authentication + valid tenant
router.use(authenticate, requireTenant);

// ── Workspaces ────────────────────────────────
router.get('/workspaces', listWorkspaces);
router.post('/workspaces', requireRole('ADMIN'), createWorkspace);
router.patch('/workspaces/:id', requireRole('ADMIN'), updateWorkspace);
router.delete('/workspaces/:id', requireRole('ADMIN'), deleteWorkspace);

// ── Invitations ───────────────────────────────
router.get('/invitations', requireRole('ADMIN'), listInvitations);
router.post('/invitations', requirePermission('users', 'create'), inviteUser);
router.delete('/invitations/:id', requireRole('ADMIN'), revokeInvitation);

// ── Public invitation info (no auth needed for display) ──
router.get('/invitations/info/:token', getInvitationInfo);
router.post('/invitations/accept/:token', acceptInvitation); // Accepts requires auth (the invitee)

// ── Org Settings ──────────────────────────────
router.get('/settings', getOrgSettings);
router.patch('/settings', requireRole('ADMIN'), updateOrgSettings);

export default router;

import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requireRole, requireSuperAdmin } from '../services/rbac.service';
import {
  listRoles, getUserRoles, assignRole, revokeRole,
  getUserPermissions, getMyPermissions,
} from '../controllers/rbac.controller';

const router = Router();

router.use(authenticate, requireTenant);

// ── My Permissions ────────────────────────────
router.get('/me', getMyPermissions);

// ── Roles ─────────────────────────────────────
router.get('/roles', requireRole('ADMIN'), listRoles);

// ── User Role Management ──────────────────────
router.get('/users/:userId/roles', requireRole('ADMIN'), getUserRoles);
router.post('/users/:userId/roles', requireRole('ADMIN'), assignRole);
router.delete('/users/:userId/roles/:roleId', requireRole('ADMIN'), revokeRole);
router.get('/users/:userId/permissions', requireRole('ADMIN'), getUserPermissions);

export default router;

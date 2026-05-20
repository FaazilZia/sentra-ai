import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireSuperAdmin } from '../services/rbac.service';
import {
  getAllOrganizations, getOrgDetail, suspendOrganization, reactivateOrganization,
  getQueueStats, getFeatureFlags, setFeatureFlag, setOrgFeatureFlag,
  getPlatformEvents, getGlobalStats, getAllUsers, banUser,
} from '../controllers/superadmin.controller';

const router = Router();

// Every route here requires SUPER_ADMIN
router.use(authenticate, requireSuperAdmin);

// ── Global Dashboard ──────────────────────────
router.get('/stats', getGlobalStats);

// ── Tenant Management ─────────────────────────
router.get('/organizations', getAllOrganizations);
router.get('/organizations/:orgId', getOrgDetail);
router.patch('/organizations/:orgId/suspend', suspendOrganization);
router.patch('/organizations/:orgId/reactivate', reactivateOrganization);
router.patch('/organizations/:orgId/flags/:key', setOrgFeatureFlag);

// ── User Management ───────────────────────────
router.get('/users', getAllUsers);
router.patch('/users/:userId/ban', banUser);

// ── Infrastructure ────────────────────────────
router.get('/queues', getQueueStats);

// ── Feature Flags ─────────────────────────────
router.get('/flags', getFeatureFlags);
router.patch('/flags/:key', setFeatureFlag);

// ── Platform Events ───────────────────────────
router.get('/events', getPlatformEvents);

export default router;

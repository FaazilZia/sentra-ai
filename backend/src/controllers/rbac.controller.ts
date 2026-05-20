import { Response, NextFunction } from 'express';
import { RBACService } from '../services/rbac.service';
import { auditLogger } from '../utils/auditLogger';

export const listRoles = async (req: any, res: Response, next: NextFunction) => {
  try {
    const roles = await RBACService.listRoles();
    res.json({ success: true, data: roles });
  } catch (e) { next(e); }
};

export const getUserRoles = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const roles = await RBACService.getUserRoles(userId, req.user.organizationId);
    res.json({ success: true, data: roles });
  } catch (e) { next(e); }
};

export const assignRole = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const { roleId } = req.body;

    const assignment = await RBACService.assignRole({
      userId,
      roleId,
      organizationId: req.user.organizationId,
      assignedBy: req.user.id,
    });

    await auditLogger.log({
      organizationId: req.user.organizationId,
      userId: req.user.id,
      action: 'ROLE_ASSIGNED',
      resourceType: 'user',
      resourceId: userId,
      eventType: 'USER_ACTION',
      severity: 'warn',
      metadata: { roleId, assignedBy: req.user.id },
    });

    res.status(201).json({ success: true, data: assignment });
  } catch (e) { next(e); }
};

export const revokeRole = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { userId, roleId } = req.params;
    await RBACService.revokeRole(userId, roleId, req.user.organizationId);

    await auditLogger.log({
      organizationId: req.user.organizationId,
      userId: req.user.id,
      action: 'ROLE_REVOKED',
      resourceType: 'user',
      resourceId: userId,
      eventType: 'USER_ACTION',
      severity: 'warn',
      metadata: { roleId },
    });

    res.json({ success: true, message: 'Role revoked' });
  } catch (e) { next(e); }
};

export const getUserPermissions = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const perms = await RBACService.getUserPermissions(userId, req.user.organizationId);
    res.json({ success: true, data: perms });
  } catch (e) { next(e); }
};

export const getMyPermissions = async (req: any, res: Response, next: NextFunction) => {
  try {
    const perms = await RBACService.getUserPermissions(req.user.id, req.user.organizationId);
    res.json({
      success: true,
      data: {
        role: req.user.role,
        permissions: perms,
        isAdmin: ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role),
        isSuperAdmin: req.user.role === 'SUPER_ADMIN',
      },
    });
  } catch (e) { next(e); }
};

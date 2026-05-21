import { Response } from 'express';
import { RBACService } from '../services/rbac.service';
import { auditLogger } from '../utils/auditLogger';
import { asyncHandler, sendSuccess, getOrgId } from '../utils/controllerHelpers';

export const listRoles = asyncHandler(async (req: any, res: Response) => {
  const roles = await RBACService.listRoles();
  return sendSuccess(res, roles);
});

export const getUserRoles = asyncHandler(async (req: any, res: Response) => {
  const { userId } = req.params;
  const organizationId = getOrgId(req);
  const roles = await RBACService.getUserRoles(userId, organizationId);
  return sendSuccess(res, roles);
});

export const assignRole = asyncHandler(async (req: any, res: Response) => {
  const { userId } = req.params;
  const { roleId } = req.body;
  const organizationId = getOrgId(req);
  const operatorId = req.user.id;

  const assignment = await RBACService.assignRole({
    userId,
    roleId,
    organizationId,
    assignedBy: operatorId,
  });

  await auditLogger.log({
    organizationId,
    userId: operatorId,
    action: 'ROLE_ASSIGNED',
    resourceType: 'user',
    resourceId: userId,
    eventType: 'USER_ACTION',
    severity: 'warn',
    metadata: { roleId, assignedBy: operatorId },
  });

  return sendSuccess(res, assignment, 201);
});

export const revokeRole = asyncHandler(async (req: any, res: Response) => {
  const { userId, roleId } = req.params;
  const organizationId = getOrgId(req);
  const operatorId = req.user.id;

  await RBACService.revokeRole(userId, roleId, organizationId);

  await auditLogger.log({
    organizationId,
    userId: operatorId,
    action: 'ROLE_REVOKED',
    resourceType: 'user',
    resourceId: userId,
    eventType: 'USER_ACTION',
    severity: 'warn',
    metadata: { roleId },
  });

  return sendSuccess(res, undefined, 200, 'Role revoked');
});

export const getUserPermissions = asyncHandler(async (req: any, res: Response) => {
  const { userId } = req.params;
  const organizationId = getOrgId(req);
  const perms = await RBACService.getUserPermissions(userId, organizationId);
  return sendSuccess(res, perms);
});

export const getMyPermissions = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.id;
  const organizationId = getOrgId(req);
  const perms = await RBACService.getUserPermissions(userId, organizationId);
  return sendSuccess(res, {
    role: req.user.role,
    permissions: perms,
    isAdmin: ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role),
    isSuperAdmin: req.user.role === 'SUPER_ADMIN',
  });
});


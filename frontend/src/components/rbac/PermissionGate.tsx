import React from 'react';
import { useAuthContext } from '../context/AuthContext';
import { PERMISSION_MATRIX } from '../lib/permissions';

interface PermissionGateProps {
  /** Resource to check, e.g. 'policies', 'audit', 'evaluation' */
  resource?: string;
  /** Action to check, e.g. 'read', 'create', 'export' */
  action?: string;
  /** Alternatively, require a specific role or list of roles */
  roles?: string | string[];
  /** Require super admin */
  superAdminOnly?: boolean;
  /** Fallback content when access is denied (default: nothing rendered) */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * PermissionGate — conditionally renders children based on the
 * authenticated user's role and permissions.
 *
 * Usage:
 *   <PermissionGate resource="audit" action="export">
 *     <ExportButton />
 *   </PermissionGate>
 *
 *   <PermissionGate roles={['ADMIN', 'COMPLIANCE_MANAGER']}>
 *     <WorkflowApprovalPanel />
 *   </PermissionGate>
 *
 *   <PermissionGate superAdminOnly>
 *     <AdminPlatform />
 *   </PermissionGate>
 */
const PermissionGate: React.FC<PermissionGateProps> = ({
  resource,
  action,
  roles,
  superAdminOnly,
  fallback = null,
  children,
}) => {
  const { user } = useAuthContext();

  if (!user) return <>{fallback}</>;

  const userRole = user.role as string;

  // Super admin check
  if (superAdminOnly) {
    return userRole === 'SUPER_ADMIN' ? <>{children}</> : <>{fallback}</>;
  }

  // SUPER_ADMIN bypasses all checks
  if (userRole === 'SUPER_ADMIN') return <>{children}</>;

  // Role check
  if (roles) {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    if (!allowedRoles.includes(userRole)) return <>{fallback}</>;
  }

  // Permission matrix check
  if (resource && action) {
    const perms: string[] = (PERMISSION_MATRIX as any)[userRole] || [];
    const hasPermission = perms.includes('*') || perms.includes(`${resource}:${action}`) || perms.includes(`${resource}:*`);
    if (!hasPermission) return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default PermissionGate;

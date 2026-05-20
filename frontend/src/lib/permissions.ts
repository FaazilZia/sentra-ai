// Client-side mirror of the backend PERMISSION_MATRIX
// Keep in sync with backend/src/services/rbac.service.ts

export const PERMISSION_MATRIX: Record<string, string[]> = {
  SUPER_ADMIN: ['*'],
  ADMIN: [
    'policies:create', 'policies:read', 'policies:update', 'policies:delete',
    'incidents:create', 'incidents:read', 'incidents:update', 'incidents:resolve',
    'audit:read', 'audit:export',
    'users:create', 'users:read', 'users:update', 'users:delete',
    'workspaces:create', 'workspaces:read', 'workspaces:update', 'workspaces:delete',
    'evaluation:create', 'evaluation:read', 'evaluation:run',
    'agents:create', 'agents:read', 'agents:update', 'agents:delete',
    'settings:read', 'settings:update',
    'apikeys:create', 'apikeys:read', 'apikeys:delete',
    'compliance:read', 'compliance:update',
    'connectors:create', 'connectors:read', 'connectors:update', 'connectors:delete',
  ],
  COMPLIANCE_MANAGER: [
    'policies:read', 'policies:update',
    'incidents:read', 'incidents:resolve',
    'audit:read', 'audit:export',
    'users:read',
    'workspaces:read',
    'evaluation:read',
    'agents:read',
    'settings:read',
    'compliance:read', 'compliance:update',
    'connectors:read',
  ],
  SECURITY_ANALYST: [
    'policies:read',
    'incidents:read', 'incidents:resolve',
    'audit:read',
    'users:read',
    'workspaces:read',
    'evaluation:read', 'evaluation:run',
    'agents:read',
    'settings:read',
    'compliance:read',
    'connectors:read',
  ],
  AUDITOR: [
    'policies:read',
    'incidents:read',
    'audit:read', 'audit:export',
    'users:read',
    'workspaces:read',
    'evaluation:read',
    'agents:read',
    'compliance:read',
    'connectors:read',
  ],
  VIEWER: [
    'policies:read',
    'incidents:read',
    'agents:read',
    'compliance:read',
    'workspaces:read',
  ],
  SERVICE_AGENT: ['policies:read', 'agents:read'],
};

export function hasPermission(role: string, resource: string, action: string): boolean {
  const perms = PERMISSION_MATRIX[role] || [];
  if (perms.includes('*')) return true;
  return perms.includes(`${resource}:${action}`) || perms.includes(`${resource}:*`);
}

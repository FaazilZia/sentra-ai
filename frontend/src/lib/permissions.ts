// Client-side mirror of the backend PERMISSION_MATRIX
// Keep in sync with backend/src/services/rbac.service.ts

const pm = (res: string, actions: string[]) => actions.map(act => `${res}:${act}`);

export const PERMISSION_MATRIX: Record<string, string[]> = {
  SUPER_ADMIN: ['*'],
  ADMIN: [
    ...pm('policies', ['create', 'read', 'update', 'delete']),
    ...pm('incidents', ['create', 'read', 'update', 'resolve']),
    ...pm('audit', ['read', 'export']),
    ...pm('users', ['create', 'read', 'update', 'delete']),
    ...pm('workspaces', ['create', 'read', 'update', 'delete']),
    ...pm('evaluation', ['create', 'read', 'run']),
    ...pm('agents', ['create', 'read', 'update', 'delete']),
    ...pm('settings', ['read', 'update']),
    ...pm('apikeys', ['create', 'read', 'delete']),
    ...pm('compliance', ['read', 'update']),
    ...pm('connectors', ['create', 'read', 'update', 'delete']),
  ],
  COMPLIANCE_MANAGER: [
    ...pm('policies', ['read', 'update']),
    ...pm('incidents', ['read', 'resolve']),
    ...pm('audit', ['read', 'export']),
    ...pm('users', ['read']),
    ...pm('workspaces', ['read']),
    ...pm('evaluation', ['read']),
    ...pm('agents', ['read']),
    ...pm('settings', ['read']),
    ...pm('compliance', ['read', 'update']),
    ...pm('connectors', ['read']),
  ],
  SECURITY_ANALYST: [
    ...pm('policies', ['read']),
    ...pm('incidents', ['read', 'resolve']),
    ...pm('audit', ['read']),
    ...pm('users', ['read']),
    ...pm('workspaces', ['read']),
    ...pm('evaluation', ['read', 'run']),
    ...pm('agents', ['read']),
    ...pm('settings', ['read']),
    ...pm('compliance', ['read']),
    ...pm('connectors', ['read']),
  ],
  AUDITOR: [
    ...pm('policies', ['read']),
    ...pm('incidents', ['read']),
    ...pm('audit', ['read', 'export']),
    ...pm('users', ['read']),
    ...pm('workspaces', ['read']),
    ...pm('evaluation', ['read']),
    ...pm('agents', ['read']),
    ...pm('compliance', ['read']),
    ...pm('connectors', ['read']),
  ],
  VIEWER: [
    ...pm('policies', ['read']),
    ...pm('incidents', ['read']),
    ...pm('agents', ['read']),
    ...pm('compliance', ['read']),
    ...pm('workspaces', ['read']),
  ],
  SERVICE_AGENT: [
    ...pm('policies', ['read']),
    ...pm('agents', ['read']),
  ],
};


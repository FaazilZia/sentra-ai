
const defaultApiBaseUrl = 'https://sentra-ai-wz6m.onrender.com/api/v1';

const apiEnvUrl = import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl;
export const apiBaseUrl = (
  apiEnvUrl.includes('/api/v') ? apiEnvUrl : `${apiEnvUrl.replace(/\/$/, '')}/api/v1`
).replace(/\/$/, '');

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  tenant_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PolicyResponse {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  effect: string;
  status: string;
  current_version: number;
  published_version: number | null;
  scope: Record<string, unknown>;
  conditions: Record<string, unknown>;
  obligations: Array<Record<string, unknown>>;
  created_at: string;
  updated_at: string;
}

export interface PolicyListResponse {
  items: PolicyResponse[];
  total: number;
}

export interface PolicyVersionResponse {
  id: string;
  policy_id: string;
  tenant_id: string;
  version: number;
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  effect: string;
  status: string;
  scope: Record<string, unknown>;
  conditions: Record<string, unknown>;
  obligations: Array<Record<string, unknown>>;
  is_published_snapshot: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantResponse {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BackendHealthResponse {
  status: string;
}

export interface PolicyHealthResponse {
  status: string;
  evaluator: string;
}

export interface IncidentResponse {
  id: string;
  agent_id: string;
  policy_id: string | null;
  severity: number;
  action: string;
  details: string;
  status: string;
  prompt_excerpt: string;
  response_excerpt: string;
  metadata: {
    pii_type?: string;
    ai_insight?: boolean;
    source?: string;
    [key: string]: any;
  };
  created_at: string;
}

export interface IncidentListResponse {
  items: IncidentResponse[];
  total: number;
}

export interface APIKeyResponse {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  is_active: boolean;
}

export interface APIKeyBundle {
  name: string;
  api_key: string;
}

export interface AIChatResponse {
  response: string;
  is_mock: boolean;
  error?: string;
}

export interface ScanResponse {
  status: string;
  message: string;
  task_id: string;
}

export interface ScanStatusResponse {
  task_id: string;
  status: string;
  result?: {
    status: string;
    incidents_detected: number;
  };
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  accessToken?: string
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const errorPayload = (await response.json()) as { detail?: string };
      if (errorPayload.detail) {
        message = errorPayload.detail;
      }
    } catch {
      // Keep the generic message if the payload is not JSON.
    }

    throw new ApiError(message, response.status);
  }

  return (await response.json()) as T;
}

export function loginRequest(email: string, password: string): Promise<TokenResponse> {
  return apiRequest<TokenResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function fetchCurrentUser(accessToken: string): Promise<AuthUser> {
  return apiRequest<AuthUser>('/me', {}, accessToken);
}

export function fetchPolicies(accessToken: string): Promise<PolicyListResponse> {
  return apiRequest<PolicyListResponse>('/policies', {}, accessToken);
}

export function fetchPolicyVersions(
  accessToken: string,
  policyId: string
): Promise<PolicyVersionResponse[]> {
  return apiRequest<PolicyVersionResponse[]>(`/policies/${policyId}/versions`, {}, accessToken);
}

export function fetchTenant(accessToken: string, tenantId: string): Promise<TenantResponse> {
  return apiRequest<TenantResponse>(`/tenants/${tenantId}`, {}, accessToken);
}

export function fetchBackendHealth(): Promise<BackendHealthResponse> {
  return apiRequest<BackendHealthResponse>('/health');
}

export function fetchPolicyHealth(): Promise<PolicyHealthResponse> {
  return apiRequest<PolicyHealthResponse>('/policy-health');
}

export function fetchIncidents(accessToken: string, limit: number = 50, status?: string): Promise<IncidentListResponse> {
  let url = `/incidents?limit=${limit}`;
  if (status) {
    url += `&status_filter=${status}`;
  }
  return apiRequest<IncidentListResponse>(url, {}, accessToken);
}

export function updateIncidentStatus(accessToken: string, incidentId: string, status: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/incidents/${incidentId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }, accessToken);
}

export function fetchApiKeys(accessToken: string): Promise<APIKeyResponse[]> {
  return apiRequest<APIKeyResponse[]>('/api-keys', {}, accessToken);
}

export function createApiKey(accessToken: string, name: string): Promise<APIKeyBundle> {
  return apiRequest<APIKeyBundle>('/api-keys', {
    method: 'POST',
    body: JSON.stringify({ name }),
  }, accessToken);
}

export function deleteApiKey(accessToken: string, keyId: string): Promise<void> {
  return apiRequest<void>(`/api-keys/${keyId}`, { method: 'DELETE' }, accessToken);
}


export async function askAI(prompt: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('generate', {
    body: { prompt }
  });
  
  if (error) {
    throw new Error(error.message || 'Error communicating with AI');
  }
  
  return data.response;
}
export async function grantConsent(token: string | null): Promise<{ status: string }> {
  if (!token) throw new Error("Auth token missing");
  return apiRequest<{ status: string }>('/consent/grant', {
    method: 'POST'
  }, token);
}

export async function withdrawConsent(token: string | null): Promise<any> {
  if (!token) throw new Error("Auth token missing");
  return apiRequest<any>('/consent/withdraw', {
    method: 'POST'
  }, token);
}

export type ConsentEvent = {
  id: string;
  action: 'GRANT' | 'WITHDRAW';
  timestamp: string;
  version: string;
  hash: string;
};

export async function fetchConsentHistory(token: string | null): Promise<ConsentEvent[]> {
  if (!token) return [];
  return apiRequest<ConsentEvent[]>('/consent/history', {
    method: 'GET'
  }, token);
}

export async function triggerScan(token: string | null): Promise<ScanResponse> {
  if (!token) throw new Error("Auth token missing");
  return apiRequest<ScanResponse>('/incidents/scan', {
    method: 'POST'
  }, token);
}

export async function fetchScanStatus(taskId: string, token: string | null): Promise<ScanStatusResponse> {
  if (!token) throw new Error("Auth token missing");
  return apiRequest<ScanStatusResponse>(`/incidents/scan/${taskId}`, {}, token);
}

export async function chatWithCopilot(message: string, token: string | null): Promise<AIChatResponse> {
  if (!token) throw new Error("Auth token missing");
  return apiRequest<AIChatResponse>('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message })
  }, token);
}
export async function fetchConnectors(token: string | null): Promise<any> {
  if (!token) return { items: [] };
  return apiRequest<any>('/connectors/', { method: 'GET' }, token);
}

export async function createConnector(token: string | null, payload: any): Promise<any> {
  if (!token) throw new Error("Auth token missing");
  return apiRequest<any>('/connectors/', {
    method: 'POST',
    body: payload
  }, token);
}

export async function testConnector(token: string | null, id: string): Promise<any> {
  if (!token) throw new Error("Auth token missing");
  return apiRequest<any>(`/connectors/${id}/test`, {
    method: 'POST'
  }, token);
}

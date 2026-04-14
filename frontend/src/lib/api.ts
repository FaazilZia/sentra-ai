import { supabase } from './supabaseClient';

// Node.js Backend base URL — must NOT have a trailing slash
const defaultApiBaseUrl = 'https://sentra-ai-wz6m.onrender.com/api';

// Use the env variable directly — no extra path manipulation to avoid double /api
export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl).replace(/\/$/, '');

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  };
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  full_name?: string; 
  role: string;
  tenant_id?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface APIKeyResponse {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
}

export interface APIKeyBundle {
  api_key: string;
  name: string;
}

export interface PolicyResponse {
  id: string;
  name: string;
  description: string;
  severity: string;
  is_active: boolean;
  version: string;
}

export interface PolicyHealthResponse {
  status: 'healthy' | 'degraded' | 'failing';
  checks: any[];
}

export interface TenantResponse {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
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
  metadata: any;
  created_at: string;
}

export interface IncidentListResponse {
  success: boolean;
  data: IncidentResponse[];
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Helper to manage tokens in localStorage
const getTokens = () => {
  const access = localStorage.getItem('sentra_access_token');
  const refresh = localStorage.getItem('sentra_refresh_token');
  return { accessToken: access, refreshToken: refresh };
};

const setTokens = (access: string, refresh?: string) => {
  localStorage.setItem('sentra_access_token', access);
  if (refresh) localStorage.setItem('sentra_refresh_token', refresh);
};

const clearTokens = () => {
  localStorage.removeItem('sentra_access_token');
  localStorage.removeItem('sentra_refresh_token');
};

/**
 * Enhanced API Request wrapper with automatic token refresh
 */
export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  retry: boolean = true
): Promise<T> {
  const { accessToken } = getTokens();
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
  });

  // Handle Token Refresh on 401
  if (response.status === 401 && retry) {
    const { refreshToken } = getTokens();
    if (refreshToken) {
      try {
        const refreshResponse = await fetch(`${apiBaseUrl}/auth/refresh-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: refreshToken }),
        });

        if (refreshResponse.ok) {
          const { data } = await refreshResponse.json();
          setTokens(data.accessToken);
          // Retry original request with NEW token
          return apiRequest<T>(path, init, false);
        }
      } catch (e) {
        console.error('Token refresh failed', e);
      }
    }
    // If refresh failed or no token, cleanup and throw
    clearTokens();
    window.dispatchEvent(new CustomEvent('auth:expired'));
  }

  const responseData = await response.text();
  let json;
  try {
    json = responseData ? JSON.parse(responseData) : {};
  } catch (e) {
    json = { message: responseData || "Invalid server response" };
  }

  if (!response.ok) {
    const errorMsg = json?.message || `Request failed with status ${response.status}`;
    throw new ApiError(errorMsg, response.status);
  }

  // Node backend wraps response in "data"
  return (json.data !== undefined ? json.data : json) as T;
}

/**
 * AUTH ENTPOINTS
 */
export function loginRequest(email: string, password: string): Promise<TokenResponse> {
  return apiRequest<any>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }).then(data => {
    // Specifically handle the auth response to store tokens
    setTokens(data.accessToken, data.refreshToken);
    return data;
  });
}

export function registerRequest(payload: any): Promise<any> {
  return apiRequest<any>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * USER ENDPOINTS
 */
export function fetchCurrentUser(): Promise<AuthUser> {
  // Points to our new Node /user/me route
  return apiRequest<AuthUser>('/user/me');
}

export function fetchTenant(tenantId: string): Promise<any> {
  return apiRequest<any>(`/tenants/${tenantId}`);
}

/**
 * POLICY ENDPOINTS (Future Node implementation)
 */
export function fetchPolicies(): Promise<any> {
  return apiRequest<any>('/policies');
}

export function fetchPolicyVersions(policyId: string): Promise<any[]> {
  return apiRequest<any[]>(`/policies/${policyId}/versions`);
}

export function fetchPolicyHealth(): Promise<any> {
  return apiRequest<any>('/policies/health');
}

/**
 * INCIDENT ENDPOINTS
 */
export function fetchIncidents(limit: number = 50, status?: string): Promise<IncidentResponse[]> {
  let url = `/incidents?limit=${limit}`;
  if (status) {
    url += `&status=${status}`;
  }
  return apiRequest<IncidentResponse[]>(url);
}

export function updateIncidentStatus(incidentId: string, status: string): Promise<IncidentResponse> {
  return apiRequest<IncidentResponse>(`/incidents/${incidentId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

/**
 * AI & COPILOT
 */
export async function askAI(prompt: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('generate', {
    body: { prompt }
  });
  
  if (error) {
    throw new Error(error.message || 'Error communicating with AI');
  }
  
  return data.response;
}

export async function chatWithCopilot(message: string): Promise<{ response: string }> {
  return apiRequest<{ response: string }>('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message })
  });
}

/**
 * HEALTH CHECKS
 */
export function fetchBackendHealth(): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>('/health');
}

/**
 * NOTE: For connectors and API keys, we point them to the same routes.
 * If these aren't implemented in Node yet, they will return 404.
 */

export function fetchApiKeys(): Promise<any[]> {
  return apiRequest<any[]>('/admin/api-keys');
}

export function createApiKey(name: string): Promise<any> {
  return apiRequest<any>('/admin/api-keys', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function deleteApiKey(keyId: string): Promise<void> {
  return apiRequest<void>(`/admin/api-keys/${keyId}`, { method: 'DELETE' });
}

export async function triggerScan(): Promise<any> {
  return apiRequest<any>('/incidents/scan', {
    method: 'POST'
  });
}

export async function fetchScanStatus(): Promise<any> {
  return apiRequest<any>('/incidents/scan/status');
}

export async function fetchConnectors(): Promise<any> {
  return apiRequest<any>('/connectors', { method: 'GET' });
}

export async function createConnector(payload: any): Promise<any> {
  return apiRequest<any>('/connectors', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

/**
 * CONSENT ENDPOINTS (stub — pending Node.js migration)
 */
export interface ConsentEvent {
  id: string;
  action: 'GRANT' | 'WITHDRAW';
  timestamp: string;
  version: string;
  hash: string;
}

export async function fetchConsentHistory(_token?: string): Promise<ConsentEvent[]> {
  return apiRequest<ConsentEvent[]>('/consent/history');
}

export async function grantConsent(_token?: string): Promise<void> {
  return apiRequest<void>('/consent/grant', { method: 'POST' });
}

export async function withdrawConsent(_token?: string): Promise<void> {
  return apiRequest<void>('/consent/withdraw', { method: 'POST' });
}


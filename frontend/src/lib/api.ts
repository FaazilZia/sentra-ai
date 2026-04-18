// Supabase Edge Functions removed — all AI calls now route through Node.js backend

function normalizeApiBaseUrl(value?: string): string {
  let trimmed = value?.trim().replace(/\/$/, '') || '';
  
  if (!trimmed) {
    return 'http://localhost:10000/api/v1';
  }

  // If it already ends with /api/v1, use it as is
  if (trimmed.endsWith('/api/v1')) {
    return trimmed;
  }

  // If it ends with /api, append /v1
  if (trimmed.endsWith('/api')) {
    return `${trimmed}/v1`;
  }

  // Otherwise, append /api/v1
  return `${trimmed}/api/v1`;
}

export const apiBaseUrl = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);

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
  role: string;
  companyId?: string;
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
  severity?: string;
  is_active?: boolean;
  status: string;
  enabled: boolean;
  priority: number;
  effect: string;
  version?: string;
  /** Present on Prisma-backed policy records */
  current_version?: number;
  scope?: { actions?: string[] } | Record<string, unknown>;
}

export interface BackendHealthResponse {
  status: 'healthy' | 'unknown';
}

export interface PolicyHealthResponse {
  status: 'healthy' | 'degraded' | 'failing';
  evaluator?: string;
  checks: Array<Record<string, unknown>>;
}

export interface CompanyResponse {
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
  data: IncidentResponse[];
}

/** Unwrapped from GET /incidents/scan/status (`apiRequest` returns `data`) */
export interface ScanStatusPayload {
  status: 'IDLE' | 'PROCESSING' | 'SUCCESS';
  progress: number;
  result: {
    incidents_detected: number;
    sources_scanned: number;
    timestamp: string;
  } | null;
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

export function fetchCompany(companyId: string): Promise<any> {
  return apiRequest<any>(`/companies/${companyId}`);
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

export interface AIActivityLog {
  id: string;
  agent_id: string;
  action: string;
  status: 'allowed' | 'blocked';
  risk_score: 'low' | 'medium' | 'high';
  reason?: string;
  impact?: string;
  explanation?: string;
  confidence?: number;
  timeline?: any;
  compliance?: string[];
  metadata?: any;
  created_at: string;
}

/**
 * AI & COPILOT
 */
export async function fetchAIActivityLogs(): Promise<AIActivityLog[]> {
  return apiRequest<AIActivityLog[]>('/ai/logs');
}

export async function replayAction(logId: string): Promise<any> {
  return apiRequest<any>('/ai/replay', {
    method: 'POST',
    body: JSON.stringify({ logId })
  });
}

export async function fetchSecurityScore(): Promise<{ score: number }> {
  return apiRequest<{ score: number }>('/ai/security-score');
}

export async function askAI(prompt: string): Promise<string> {
  const data = await apiRequest<{ response: string }>('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message: prompt })
  });
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
export function fetchBackendHealth(): Promise<BackendHealthResponse> {
  return apiRequest<BackendHealthResponse>('/health');
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

export async function triggerScan(): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/incidents/scan', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function fetchScanStatus(): Promise<ScanStatusPayload> {
  return apiRequest<ScanStatusPayload>('/incidents/scan/status');
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

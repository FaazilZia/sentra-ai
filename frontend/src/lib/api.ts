const defaultApiBaseUrl = 'http://127.0.0.1:8000/api/v1';

export const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl
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
  prompt_excerpt: string;
  response_excerpt: string;
  metadata: Record<string, unknown>;
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

export function fetchIncidents(accessToken: string, limit: number = 50): Promise<IncidentListResponse> {
  return apiRequest<IncidentListResponse>(`/incidents?limit=${limit}`, {}, accessToken);
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

import { supabase } from './supabaseClient';

export async function askAI(prompt: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('generate', {
    body: { prompt }
  });
  
  if (error) {
    throw new Error(error.message || 'Error communicating with AI');
  }
  
  return data.response;
}

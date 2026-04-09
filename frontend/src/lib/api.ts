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

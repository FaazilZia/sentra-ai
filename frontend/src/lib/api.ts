// Supabase Edge Functions removed — all AI calls now route through Node.js backend

function normalizeApiBaseUrl(value?: string): string {
  const trimmed = value?.trim().replace(/\/$/, '') || '';
  
  if (!trimmed) {
    console.warn('⚠️ No VITE_API_BASE_URL found, falling back to localhost:10000/api/v1');
    return 'http://localhost:10000/api/v1';
  }

  // If it already ends with /api/v1, use it as is
  if (trimmed.endsWith('/api/v1')) {
    return trimmed;
  }

  // If it ends with /api, append /v1
  if (trimmed.endsWith('/api')) {
    const normalized = `${trimmed}/v1`;
    console.info(`🌐 Normalized API URL: ${normalized}`);
    return normalized;
  }

  // Otherwise, append /api/v1
  const normalized = `${trimmed}/api/v1`;
  console.info(`🌐 Normalized API URL: ${normalized}`);
  return normalized;
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
  organizationId?: string;
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
  created_at?: string;
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

export interface AIAgent {
  id: string;
  name: string;
  model: string;
  permissions: string[];
  status: 'active' | 'inactive';
  created_at: string;
}

export interface ComplianceStats {
  totalViolations: number;
  breakdown: {
    GDPR: number;
    HIPAA: number;
    DPDP: number;
  };
  piiViolations?: {
    GDPR: number;
    HIPAA: number;
    DPDP: number;
  };
  riskTrends: Array<{ date: string; risk: number }>;
}

export interface ComplianceFeature {
  id: string;
  feature_name: string;
  description: string;
  status: 'compliant' | 'warning' | 'non_compliant';
  evidence: Array<{
    type: string;
    content: any;
  }>;
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
  data?: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

let memoryCsrfToken: string | null = null;

export function getCsrfToken(): string | null {
  if (memoryCsrfToken) return memoryCsrfToken;
  try {
    const sessionToken = sessionStorage.getItem('sentra_csrf_token');
    if (sessionToken) {
      memoryCsrfToken = sessionToken;
      return sessionToken;
    }
  } catch (e) {}

  const name = 'sentra_csrf_token=';
  const decodedCookie = decodeURIComponent(document.cookie);
  const ca = decodedCookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) === 0) {
      return c.substring(name.length, c.length);
    }
  }
  return null;
}

/**
 * Enhanced API Request wrapper with automatic token refresh
 */
export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  retry: boolean = true
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');

  const method = (init.method || 'GET').toUpperCase();
  const mutatingMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
  if (mutatingMethods.includes(method)) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers.set('x-csrf-token', csrfToken);
    }
  }

  const impersonationToken = localStorage.getItem('sentra_impersonation_token');
  const accessToken = localStorage.getItem('sentra_access_token');
  if (impersonationToken) {
    headers.set('Authorization', `Bearer ${impersonationToken}`);
  } else if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  // Extract CSRF token from response headers if present
  const responseCsrf = response.headers.get('x-csrf-token');
  if (responseCsrf) {
    memoryCsrfToken = responseCsrf;
    try {
      sessionStorage.setItem('sentra_csrf_token', responseCsrf);
    } catch (e) {}
  }

  // Handle Token Refresh on 401
  if (response.status === 401 && retry) {
    const tokenUsed = impersonationToken || accessToken || '';
    window.dispatchEvent(new CustomEvent('auth:expired', { detail: { token: tokenUsed } }));
  }

  const responseData = await response.text();
  let json: any;
  try {
    json = responseData ? JSON.parse(responseData) : {};
  } catch (e) {
    json = { message: responseData || "Invalid server response" };
  }

  if (!response.ok) {
    const errorMsg = json?.message || `Request failed with status ${response.status}`;
    throw new ApiError(errorMsg, response.status, json);
  }

  // Node backend wraps response in "data"
  const result = (json.data !== undefined ? json.data : json) as T;
  
  if (import.meta.env.DEV) {
    console.debug(`[API] SUCCESS: ${path}`, result);
  }

  return result;
}

/**
 * AUTH ENDPOINTS
 */
export function loginRequest(email: string, password: string): Promise<TokenResponse> {
  return apiRequest<any>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
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

export function fetchCompany(organizationId: string): Promise<any> {
  return apiRequest<any>(`/organizations/${organizationId}`);
}

/**
 * POLICY ENDPOINTS (Future Node implementation)
 */
export function fetchPolicyTemplates(): Promise<any[]> {
  return apiRequest<any[]>('/policies/templates');
}

export function duplicatePolicyTemplate(policyId: string): Promise<PolicyResponse> {
  return apiRequest<PolicyResponse>(`/policies/${policyId}/duplicate`, {
    method: 'POST'
  });
}

export function fetchPolicies(): Promise<PolicyResponse[]> {
  return apiRequest<PolicyResponse[]>('/policies');
}

export function fetchPolicyById(id: string): Promise<PolicyResponse> {
  return apiRequest<PolicyResponse>(`/policies/${id}`);
}

export function patchPolicy(id: string, payload: Partial<PolicyResponse>): Promise<PolicyResponse> {
  return apiRequest<PolicyResponse>(`/policies/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function createPolicy(payload: any): Promise<PolicyResponse> {
  return apiRequest<PolicyResponse>('/policies', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchPolicyVersions(policyId: string): Promise<any[]> {
  return apiRequest<any[]>(`/policies/${policyId}/versions`);
}

export function deletePolicy(id: string): Promise<void> {
  return apiRequest<void>(`/policies/${id}`, {
    method: 'DELETE',
  });
}

export function fetchPolicyHealth(): Promise<any> {
  return apiRequest<any>('/policies/health');
}

/**
 * INCIDENT ENDPOINTS
 */
export function fetchViolations(limit: number = 50, status?: string): Promise<IncidentResponse[]> {
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

/**
 * INVENTORY
 */
export async function fetchAIAgents(): Promise<AIAgent[]> {
  return apiRequest<AIAgent[]>('/inventory/agents');
}

export async function createAIAgent(payload: any): Promise<AIAgent> {
  return apiRequest<AIAgent>('/inventory/agents', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function deleteAIAgent(id: string): Promise<void> {
  return apiRequest<void>(`/inventory/agents/${id}`, {
    method: 'DELETE',
  });
}

/**
 * COMPLIANCE
 */
export async function fetchComplianceStats(): Promise<ComplianceStats> {
  // We'll implement this on the backend soon, for now it might 404
  return apiRequest<ComplianceStats>('/compliance/stats');
}

export async function fetchAuditProof(): Promise<ComplianceFeature[]> {
  return apiRequest<ComplianceFeature[]>('/compliance/audit-proof');
}

export interface ComplianceFixTask {
  id: string;
  featureId: string;
  title: string;
  description: string | null;
  priority: number;
  status: 'pending' | 'completed';
  created_at: string;
  evidence: Array<{
    id: string;
    type: string;
    value: string;
    uploaded_at: string;
  }>;
}

export async function fetchFixTasks(featureId: string): Promise<ComplianceFixTask[]> {
  return apiRequest<ComplianceFixTask[]>(`/compliance/fix-tasks/${featureId}`);
}

export async function createFixTasks(featureId: string, actionPlan: any): Promise<ComplianceFixTask[]> {
  return apiRequest<ComplianceFixTask[]>('/compliance/fix-tasks', {
    method: 'POST',
    body: JSON.stringify({ featureId, actionPlan })
  });
}

export async function uploadEvidence(taskId: string, type: string, value: string): Promise<any> {
  return apiRequest<any>('/compliance/evidence', {
    method: 'POST',
    body: JSON.stringify({ taskId, type, value })
  });
}

export async function reEvaluateCompliance(featureId: string): Promise<any> {
  return apiRequest<any>('/compliance/re-evaluate', {
    method: 'POST',
    body: JSON.stringify({ featureId })
  });
}

export interface ComplianceSnapshot {
  id: string;
  gdpr_score: number;
  dpdp_score: number;
  hipaa_score: number;
  risk_level: string;
  created_at: string;
}

export async function fetchComplianceHistory(featureId: string): Promise<ComplianceSnapshot[]> {
  return apiRequest<ComplianceSnapshot[]>(`/compliance/history/${featureId}`);
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  feature_id: string | null;
  metadata: any;
  timestamp: string;
}

export async function fetchAuditLogs(featureId?: string): Promise<AuditLog[]> {
  const query = featureId ? `?featureId=${featureId}` : '';
  return apiRequest<AuditLog[]>(`/compliance/audit-logs${query}`);
}

export interface AlertRule {
  id: string;
  organizationId: string;
  threshold_count: number;
  time_window_minutes: number;
  webhook_url: string;
  created_at: string;
}

export async function createAlertRule(data: { threshold_count: number, time_window_minutes: number, webhook_url: string }): Promise<AlertRule> {
  return apiRequest<AlertRule>('/alerts/rules', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function fetchAlertRules(): Promise<AlertRule[]> {
  return apiRequest<AlertRule[]>('/alerts/rules');
}

export interface Alert {
  id: string;
  feature_id: string | null;
  type: string;
  message: string;
  severity: string;
  is_read: boolean;
  created_at: string;
}

export async function fetchAlerts(): Promise<Alert[]> {
  return apiRequest<Alert[]>('/compliance/alerts');
}

export async function markAlertRead(alertId: string): Promise<void> {
  return apiRequest<void>('/compliance/alerts/mark-read', {
    method: 'POST',
    body: JSON.stringify({ alertId })
  });
}

export async function exportComplianceReport(featureId: string): Promise<Blob> {
  const response = await fetch(`${apiBaseUrl}/compliance/export/${featureId}`, {
    credentials: 'include'
  });
  if (!response.ok) throw new Error('Failed to export report');
  return response.blob();
}

export interface InterceptionLog {
  id: string;
  user_id: string;
  input_text: string;
  output_text: string | null;
  decision: 'ALLOW' | 'MODIFY' | 'BLOCK';
  confidence: 'High' | 'Medium' | 'Low';
  override_status: 'none' | 'pending' | 'approved' | 'rejected';
  reason: string | null;
  policy_triggered: string | null;
  timestamp: string;
}

export interface GuardrailOverride {
  id: string;
  log_id: string;
  requested_by: string;
  approved_by: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  timestamp: string;
}

export interface GuardrailMetrics {
  total: number;
  allowed: number;
  blocked: number;
  modified: number;
  allowedCount: number;
  blockedCount: number;
  modifiedCount: number;
}


export async function sendAIRequest(prompt: string): Promise<any> {
  return apiRequest<any>('/guardrails/proxy', {
    method: 'POST',
    body: JSON.stringify({ prompt })
  });
}

export async function fetchGuardrailLogs(params?: any): Promise<{ data: InterceptionLog[]; meta: any }> {
  const query = new URLSearchParams(params || {}).toString();
  return apiRequest<{ data: InterceptionLog[]; meta: any }>(`/guardrails/logs${query ? `?${query}` : ''}`);
}

export async function exportGuardrailLogs(format: 'csv' | 'json' = 'csv', params?: any) {
  const query = new URLSearchParams({ ...params, format }).toString();
  
  try {
    const response = await fetch(`${apiBaseUrl}/guardrails/logs/export?${query}`, {
      credentials: 'include'
    });

    if (!response.ok) throw new Error('Export failed');

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().getTime()}.${format}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (err) {
    console.error('Audit Log Export Error:', err);
    alert('Failed to export logs. Please try again.');
  }
}

export async function fetchGuardrailMetrics(): Promise<GuardrailMetrics> {
  return apiRequest<GuardrailMetrics>('/guardrails/metrics');
}

export async function fetchGuardrailOverrides(): Promise<GuardrailOverride[]> {
  return apiRequest<GuardrailOverride[]>('/guardrails/overrides');
}

export async function requestGuardrailOverride(logId: string, reason: string): Promise<any> {
  return apiRequest<any>('/guardrails/override/request', {
    method: 'POST',
    body: JSON.stringify({ logId, reason })
  });
}

export async function approveGuardrailOverride(overrideId: string, status: 'approved' | 'rejected'): Promise<any> {
  return apiRequest<any>('/guardrails/override/approve', {
    method: 'POST',
    body: JSON.stringify({ overrideId, status })
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

export async function fetchDashboardStats(): Promise<any> {
  return apiRequest<any>('/ai/dashboard-stats');
}

export async function fetchScans(): Promise<{ count: number }> {
  // Map to intelligence metrics for now
  const metrics = await apiRequest<any>('/intelligence/metrics');
  return { count: metrics.totalActions || 0 };
}

export async function fetchRiskData(): Promise<any> {
  return apiRequest<any>('/risk');
}

export async function fetchExecutiveMetrics(): Promise<any> {
  return apiRequest<any>('/intelligence/metrics');
}

export async function fetchTopAttackPatterns(): Promise<any[]> {
  return apiRequest<any[]>('/intelligence/patterns');
}

export async function fetchRiskTrend(days: number = 7): Promise<any[]> {
  return apiRequest<any[]>(`/intelligence/trend?days=${days}`);
}

export async function createConnector(payload: any): Promise<any> {
  return apiRequest<any>('/connectors', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export interface ExecutiveOverview {
  systemMode: 'autonomous' | 'restricted' | 'high_alert';
  auditSummary: {
    scansLast24h: number;
    violationsDetected: number;
    budgetUsed: number;
    budgetLimit: number;
    activeConnectors: number;
    healthScore: number;
  };
  controls: {
    scanningMode: string;
    authority: 'full' | 'limited';
  };
}

export async function fetchExecutiveOverview(): Promise<ExecutiveOverview> {
  return apiRequest<ExecutiveOverview>('/connectors/overview');
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

export async function fetchConsentHistory(): Promise<ConsentEvent[]> {
  return apiRequest<ConsentEvent[]>('/consent/history');
}

export async function grantConsent(): Promise<void> {
  return apiRequest<void>('/consent/grant', { method: 'POST' });
}

export async function withdrawConsent(): Promise<void> {
  return apiRequest<void>('/consent/withdraw', { method: 'POST' });
}

/**
 * ALERT SETTINGS
 */
export async function updateAlertSettings(payload: { alertEmail?: string; slackWebhookUrl?: string }): Promise<any> {
  return apiRequest<any>('/organizations/alert-settings', {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function testAlert(): Promise<any> {
  return apiRequest<any>('/organizations/test-alert', { method: 'POST' });
}

export async function rotateApiKey(): Promise<{ api_key: string }> {
  return apiRequest<{ api_key: string }>('/api-keys/rotate', { method: 'POST' });
}

export async function updateAlertEmail(email: string): Promise<any> {
  return apiRequest<any>('/organizations/alert-email', {
    method: 'PUT',
    body: JSON.stringify({ email })
  });
}

export async function updateWebhookUrl(url: string): Promise<any> {
  return apiRequest<any>('/organizations/webhook', {
    method: 'PUT',
    body: JSON.stringify({ url })
  });
}

/**
 * DRIFT DETECTION ENDPOINTS
 */
export interface DriftAlert {
  id: string;
  organizationId: string;
  agentId: string;
  type: string;
  severity: string;
  description: string;
  status: 'open' | 'resolved';
  timestamp: string;
  driftScore: number;
  unexpectedActions: string[];
  detectedAt: string;
  message?: string;
}

export async function fetchDriftAlerts(status?: string, agentId?: string): Promise<DriftAlert[]> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (agentId) params.append('agentId', agentId);
  const queryStr = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<DriftAlert[]>(`/drift/alerts${queryStr}`);
}

export async function triggerDriftScan(): Promise<DriftAlert[]> {
  return apiRequest<DriftAlert[]>('/drift/scan', { method: 'POST' });
}

export async function resolveDriftAlert(id: string): Promise<DriftAlert> {
  return apiRequest<DriftAlert>(`/drift/alerts/${id}/resolve`, { method: 'PATCH' });
}

export const fetchFriaAssessments = () => apiRequest<any>('/fria/assessments');
export const fetchFriaAssessment = (id: string) => apiRequest<any>(`/fria/assessments/${id}`);
export const createFriaAssessment = (aiSystemId: string) =>
  apiRequest<any>('/fria/assessments', { method: 'POST', body: JSON.stringify({ aiSystemId }) });

/**
 * SLACK INTEGRATION ENDPOINTS
 */
export interface SlackConfig {
  id?: string;
  orgId?: string;
  webhookUrl: string;
  channel: string;
  enabled: boolean;
  notifyOn: string[];
}

export async function fetchSlackConfig(): Promise<SlackConfig> {
  return apiRequest<SlackConfig>('/slack/config');
}

export async function saveSlackConfig(payload: SlackConfig): Promise<SlackConfig> {
  return apiRequest<SlackConfig>('/slack/config', {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export async function deleteSlackConfig(): Promise<void> {
  return apiRequest<void>('/slack/config', { method: 'DELETE' });
}

export async function testSlackConnection(payload: { webhookUrl: string; channel: string }): Promise<void> {
  return apiRequest<void>('/slack/test', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

/**
 * CHANGE HISTORY ENDPOINTS
 */
export interface ChangeHistory {
  id: string;
  orgId: string;
  entityType: 'policy' | 'risk' | 'incident' | 'guardrail' | 'agent' | 'compliance' | 'workflow';
  entityId: string;
  changedBy: string;
  changeType: 'created' | 'updated' | 'deleted' | 'status_changed' | 'assigned';
  previousValue: any;
  newValue: any;
  changeNote?: string;
  createdAt: string;
  user?: {
    full_name: string;
    email: string;
  };
}

export async function fetchEntityHistory(entityType: string, entityId: string): Promise<ChangeHistory[]> {
  return apiRequest<ChangeHistory[]>(`/change-history/${entityType}/${entityId}`);
}

export async function fetchRecentHistory(limit?: number): Promise<ChangeHistory[]> {
  const queryStr = limit ? `?limit=${limit}` : '';
  return apiRequest<ChangeHistory[]>(`/change-history/recent${queryStr}`);
}

/**
 * INTAKE FORM ENDPOINTS
 */
export interface IntakeForm {
  id: string;
  orgId: string;
  title: string;
  description?: string;
  fields: any[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IntakeSubmission {
  id: string;
  orgId: string;
  formId: string;
  submittedBy: string;
  agentName: string;
  agentDescription: string;
  useCase: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewNote?: string;
  formData: any;
  createdAt: string;
  updatedAt: string;
  submitter?: {
    full_name: string;
    email: string;
  };
  reviewer?: {
    full_name: string;
    email: string;
  };
}

export async function fetchIntakeForm(): Promise<IntakeForm> {
  return apiRequest<IntakeForm>('/intake/form');
}

export async function submitIntake(payload: {
  agentName: string;
  agentDescription: string;
  useCase: string;
  formData: any;
}): Promise<IntakeSubmission> {
  return apiRequest<IntakeSubmission>('/intake/submissions', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function fetchSubmissions(status?: string): Promise<IntakeSubmission[]> {
  const queryStr = status ? `?status=${status}` : '';
  return apiRequest<IntakeSubmission[]>(`/intake/submissions${queryStr}`);
}

export async function approveSubmission(id: string, note?: string): Promise<{ submission: IntakeSubmission, system: any }> {
  return apiRequest<{ submission: IntakeSubmission, system: any }>(`/intake/submissions/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ note })
  });
}

export async function rejectSubmission(id: string, note: string): Promise<IntakeSubmission> {
  return apiRequest<IntakeSubmission>(`/intake/submissions/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ note })
  });
}

export interface RiskPortfolioResponse {
  averageScore: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  trend: number;
  scoresByAgent: Array<{
    agentId: string;
    agentName: string;
    compositeScore: number;
    likelihood: number;
    impact: number;
    lastUpdated: string;
  }>;
}

export interface AgentRiskScoreResponse {
  current: {
    composite: number;
    likelihood: number;
    impact: number;
    lastUpdated: string;
  };
  history: Array<{
    date: string;
    composite?: number;
    likelihood?: number;
    impact?: number;
  }>;
}

export interface ShareLink {
  id: string;
  orgId: string;
  createdBy: string;
  resourceType: 'report' | 'compliance' | 'risk' | 'audit';
  resourceId: string | null;
  token: string;
  expiresAt: string | null;
  viewCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface SharedViewResponse {
  resourceType: 'report' | 'compliance' | 'risk' | 'audit';
  resourceId: string | null;
  expiresAt: string | null;
  viewCount: number;
  createdAt: string;
  organization: {
    name: string;
    slug: string;
  };
  data: any;
}

export async function fetchRiskPortfolio(): Promise<RiskPortfolioResponse> {
  return apiRequest<RiskPortfolioResponse>('/risk/portfolio');
}

export async function fetchAgentRiskScore(agentId: string): Promise<AgentRiskScoreResponse> {
  return apiRequest<AgentRiskScoreResponse>(`/risk/agent/${agentId}/score`);
}

export async function updateAgentRiskScore(
  agentId: string,
  likelihood: number,
  impact: number,
  methodology?: string
): Promise<{ likelihood: number; impact: number; composite: number }> {
  return apiRequest<{ likelihood: number; impact: number; composite: number }>(`/risk/agent/${agentId}/score`, {
    method: 'PUT',
    body: JSON.stringify({ likelihood, impact, methodology })
  });
}

export async function fetchOrgRiskTrend(days: number = 30): Promise<Array<{ date: string; score: number }>> {
  return apiRequest<Array<{ date: string; score: number }>>(`/risk/trend?days=${days}`);
}

export async function createShareLink(
  resourceType: 'report' | 'compliance' | 'risk' | 'audit',
  resourceId: string | null,
  expiresInDays?: number
): Promise<ShareLink> {
  return apiRequest<ShareLink>('/share-links', {
    method: 'POST',
    body: JSON.stringify({ resourceType, resourceId, expiresInDays })
  });
}

export async function fetchShareLinks(
  resourceType: 'report' | 'compliance' | 'risk' | 'audit',
  resourceId: string | null
): Promise<ShareLink[]> {
  return apiRequest<ShareLink[]>(`/share-links/${resourceType}/${resourceId || 'null'}`);
}

export async function revokeShareLink(id: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/share-links/${id}`, {
    method: 'DELETE'
  });
}

export async function resolveShareLink(token: string): Promise<SharedViewResponse> {
  return apiRequest<SharedViewResponse>(`/share-links/view/${token}`);
}

export interface EuAiActControlImplementation {
  status: string;
  notes: string | null;
  owner_user_id: string | null;
  due_date: string | null;
  evidence_links: Array<{
    type: string;
    url: string;
    description: string;
    uploaded_at: string;
  }>;
  last_reviewed: string | null;
}

export interface EuAiActControl {
  control_code: string;
  title: string;
  description: string;
  evidence_required: string[];
  checklist_items: string[];
  implementation: EuAiActControlImplementation | null;
}

export interface EuAiActArticle {
  article_number: string;
  title: string;
  chapter: string;
  risk_tier: string;
  controls: EuAiActControl[];
}

export interface EuAiActOverview {
  articles: EuAiActArticle[];
  summary: {
    total_controls: number;
    implemented: number;
    in_progress: number;
    not_started: number;
    not_applicable: number;
    compliance_score: number;
  };
}

export async function fetchEuAiActOverview(): Promise<EuAiActOverview> {
  return apiRequest<EuAiActOverview>('/compliance/eu-ai-act/overview');
}

export async function updateEuAiActImplementation(
  controlCode: string,
  data: {
    status: string;
    notes?: string;
    owner_user_id?: string;
    due_date?: string | null;
  }
): Promise<any> {
  return apiRequest<any>(`/compliance/eu-ai-act/controls/${controlCode}/implementation`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

export async function uploadEuAiActEvidence(
  controlCode: string,
  data: {
    type: string;
    url: string;
    description: string;
  }
): Promise<any> {
  return apiRequest<any>(`/compliance/eu-ai-act/evidence/${controlCode}`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function fetchNistAiRmfOverview(): Promise<any> {
  return apiRequest<any>('/compliance/nist-ai-rmf/overview');
}

export async function updateNistAiRmfImplementation(
  subcategoryCode: string,
  data: {
    status: string;
    maturity_level?: number;
    risk_escalation_level?: string;
    notes?: string;
  }
): Promise<any> {
  return apiRequest<any>(`/compliance/nist-ai-rmf/implementation/${subcategoryCode}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

export async function fetchNistAiRmfCrossFrameworkImpact(subcategoryCode: string): Promise<any> {
  return apiRequest<any>(`/compliance/nist-ai-rmf/cross-framework-impact/${subcategoryCode}`);
}

export async function fetchNistAiRmfHealth(): Promise<any> {
  return apiRequest<any>('/compliance/nist-ai-rmf/health');
}

export async function exportNistAiRmfSignedConformity(): Promise<any> {
  return apiRequest<any>('/compliance/nist-ai-rmf/export');
}

/**
 * AI SYSTEMS LISTING FOR DROPDOWNS & TIMELINES
 */
export interface AISystemItem {
  id: string;
  name: string;
  description?: string | null;
  model_name: string;
  model_version: string;
  vendor: string;
  use_case: string;
  risk_tier: string;
  status: string;
  lifecycle_stage: string;
  created_at: string;
  updated_at: string;
}

export async function fetchAISystems(): Promise<AISystemItem[]> {
  return apiRequest<AISystemItem[]>('/ai-systems');
}

/**
 * AI ADVISOR ENDPOINTS
 */
export interface AdvisorMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function fetchAdvisorSuggestions(): Promise<string[]> {
  return apiRequest<string[]>('/advisor/suggestions');
}

/**
 * AUTOMATIONS ENDPOINTS
 */
export interface Automation {
  id: string;
  name: string;
  description?: string | null;
  trigger_type: string;
  trigger_config: any;
  action_type: string;
  action_config: any;
  is_active: boolean;
  last_run_at?: string | null;
  created_at: string;
  updated_at: string;
  execution_logs?: AutomationExecutionLog[];
}

export interface AutomationExecutionLog {
  id: string;
  automation_id: string;
  status: 'SUCCESS' | 'FAILURE' | 'SKIPPED';
  output?: string | null;
  ran_at: string;
}

export async function fetchAutomations(): Promise<Automation[]> {
  return apiRequest<Automation[]>('/automations');
}

export async function createAutomation(payload: Partial<Automation>): Promise<Automation> {
  return apiRequest<Automation>('/automations', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function toggleAutomation(id: string, is_active: boolean): Promise<Automation> {
  return apiRequest<Automation>(`/automations/${id}/toggle`, {
    method: 'PATCH',
    body: JSON.stringify({ is_active })
  });
}

export async function deleteAutomation(id: string): Promise<void> {
  return apiRequest<void>(`/automations/${id}`, {
    method: 'DELETE'
  });
}

/**
 * DATASETS ENDPOINTS
 */
export interface Dataset {
  id: string;
  name: string;
  description?: string | null;
  dataset_type: string;
  data_classification: string;
  status: string;
  source_url?: string | null;
  ai_system_id?: string | null;
  record_count?: number | null;
  last_updated?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  ai_system?: {
    id: string;
    name: string;
  } | null;
  tags?: Array<{ id: string; tag: string }> | string[];
}

export async function fetchDatasets(): Promise<Dataset[]> {
  return apiRequest<Dataset[]>('/datasets');
}

export async function createDataset(payload: any): Promise<Dataset> {
  return apiRequest<Dataset>('/datasets', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function deleteDataset(id: string): Promise<void> {
  return apiRequest<void>(`/datasets/${id}`, {
    method: 'DELETE'
  });
}

export async function linkDatasetToSystem(id: string, aiSystemId: string | null): Promise<Dataset> {
  return apiRequest<Dataset>(`/datasets/${id}/link`, {
    method: 'POST',
    body: JSON.stringify({ aiSystemId })
  });
}

/**
 * MODEL LIFECYCLE ENDPOINTS
 */
export interface LifecycleEvent {
  id: string;
  ai_system_id: string;
  stage: string;
  notes?: string | null;
  changed_by: string;
  effective_date: string;
  created_at: string;
}

export interface LifecycleInfo {
  currentStage: string;
  history: LifecycleEvent[];
}

export async function fetchLifecycleInfo(aiSystemId: string): Promise<LifecycleInfo> {
  return apiRequest<LifecycleInfo>(`/model-lifecycle/${aiSystemId}`);
}

export async function transitionModelStage(
  aiSystemId: string,
  stage: string,
  notes?: string
): Promise<any> {
  return apiRequest<any>(`/model-lifecycle/${aiSystemId}/transition`, {
    method: 'POST',
    body: JSON.stringify({ stage, notes })
  });
}

/**
 * TRAINING REGISTER ENDPOINTS
 */
export interface TrainingCourse {
  id: string;
  title: string;
  description?: string | null;
  framework_tags: string[];
  duration_minutes: number;
  is_mandatory: boolean;
  created_at: string;
  completions?: TrainingCompletion[];
}

export interface TrainingCompletion {
  id: string;
  course_id: string;
  user_id: string;
  completed_at: string;
  score?: number | null;
  passed: boolean;
  notes?: string | null;
  user?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface TrainingStatus {
  totalCourses: number;
  mandatoryCourses: number;
  completionsCount: number;
  completionRate: number;
  pendingGaps: number;
  gaps: Array<{
    userId: string;
    userName: string;
    userEmail: string;
    courseId: string;
    courseTitle: string;
  }>;
}

export async function fetchTrainingCourses(): Promise<TrainingCourse[]> {
  return apiRequest<TrainingCourse[]>('/training/courses');
}

export async function createTrainingCourse(payload: any): Promise<TrainingCourse> {
  return apiRequest<TrainingCourse>('/training/courses', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function recordTrainingCompletion(courseId: string, payload: {
  userId: string;
  score?: number;
  passed?: boolean;
  notes?: string;
}): Promise<TrainingCompletion> {
  return apiRequest<TrainingCompletion>(`/training/courses/${courseId}/complete`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function fetchTrainingStatus(): Promise<TrainingStatus> {
  return apiRequest<TrainingStatus>('/training/status');
}

/**
 * CROSS-FRAMEWORK MAPPER (GovernanceOS) ENDPOINTS
 */
export interface FrameworkMappingItem {
  id: string;
  concernArea: string;
  nistCode: string;
  nistTitle: string;
  euArticle: string;
  euTitle: string;
  iso42001Control: string;
  iso42001Title: string;
  iso27001Control: string;
  iso27001Title: string;
  status: 'implemented' | 'in_progress' | 'not_started' | 'not_applicable';
}

export interface GapAnalysisItem {
  framework: string;
  controlCode: string;
  controlTitle: string;
  mappedFrom: string;
  mappedControl: string;
  gapType: 'missing_implementation' | 'no_direct_equivalent';
  severity: 'high' | 'medium' | 'low';
}

export async function fetchFrameworkMap(): Promise<FrameworkMappingItem[]> {
  return apiRequest<FrameworkMappingItem[]>('/framework-mapper/overview');
}

export async function fetchGapAnalysis(): Promise<GapAnalysisItem[]> {
  return apiRequest<GapAnalysisItem[]>('/framework-mapper/gaps');
}

export async function fetchOverlapScore(): Promise<{ score: number; totalMapped: number; totalImplemented: number }> {
  return apiRequest<{ score: number; totalMapped: number; totalImplemented: number }>('/framework-mapper/overlap-score');
}

/**
 * AI INTAKE SUGGESTIONS & RISK SCORING
 */
export async function suggestIntakeQuestions(description: string): Promise<string[]> {
  return apiRequest<string[]>('/intake/suggest-questions', {
    method: 'POST',
    body: JSON.stringify({ description })
  });
}

export async function fetchSubmissionRiskScore(submissionId: string): Promise<any> {
  return apiRequest<any>(`/intake/submissions/${submissionId}/risk-score`);
}

/**
 * MCP GATEWAY & AGENT KEY ENDPOINTS
 */
export async function fetchMcpAgentKeys(): Promise<any[]> {
  return apiRequest<any[]>('/mcp/agent-keys');
}

export async function createMcpAgentKey(
  name: string,
  allowedTools: string[] = [],
  blockedTools: string[] = []
): Promise<any> {
  return apiRequest<any>('/mcp/agent-keys', {
    method: 'POST',
    body: JSON.stringify({ name, allowedTools, blockedTools }),
  });
}

export async function revokeMcpAgentKey(keyId: string): Promise<any> {
  return apiRequest<any>(`/mcp/agent-keys/${keyId}`, {
    method: 'DELETE',
  });
}

export async function fetchMcpAuditLogs(page = 1, limit = 20, decision?: string): Promise<any> {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(decision && decision !== 'all' ? { decision } : {}),
  }).toString();
  return apiRequest<any>(`/mcp/audit-logs?${query}`);
}

/**
 * SAML SSO ENDPOINTS
 */
export async function saveSsoConfig(idpMetadataXml: string, ssoProvider?: string): Promise<any> {
  return apiRequest<any>('/sso/config', {
    method: 'PUT',
    body: JSON.stringify({ idpMetadataXml, sso_provider: ssoProvider }),
  });
}







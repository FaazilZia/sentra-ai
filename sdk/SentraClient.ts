export interface TelemetryEvent {
  agentName: string;
  action: string;
  severity: number;
  policyId?: string;
  details?: string;
  promptExcerpt?: string;
  responseExcerpt?: string;
  metadata?: Record<string, any>;
}

export interface ScanStatus {
  status: 'IDLE' | 'PROCESSING' | 'SUCCESS';
  progress: number;
  result: {
    incidents_detected: number;
    sources_scanned: number;
    timestamp: string;
  } | null;
}

export class SentraClient {
  private baseUrl: string;
  private apiKey: string;
  private backendBearerToken: string;

  constructor(options: { baseUrl?: string; apiKey?: string; backendBearerToken?: string } = {}) {
    const envBaseUrl =
      typeof process !== 'undefined' && process.env?.SENTRA_API_BASE_URL
        ? process.env.SENTRA_API_BASE_URL
        : undefined;
    this.baseUrl = this.normalizeBaseUrl(options.baseUrl || envBaseUrl || 'http://localhost:3000/api');
    this.apiKey = options.apiKey || '';
    this.backendBearerToken = options.backendBearerToken || '';
  }

  private normalizeBaseUrl(value: string): string {
    const trimmed = value.replace(/\/$/, '');
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (this.backendBearerToken) {
      headers['Authorization'] = `Bearer ${this.backendBearerToken}`;
    }
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }
    return headers;
  }

  /**
   * Logs an AI incident or telemetry event to the Sentra Governance Dashboard.
   * Useful for tracking LangChain trace steps, rogue agent actions, or policy violations.
   */
  async logEvent(event: TelemetryEvent): Promise<{ status: string; id: string }> {
    const response = await fetch(`${this.baseUrl}/incidents/log`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        agent_id: event.agentName,
        action: event.action,
        severity: event.severity,
        policy_id: event.policyId,
        details: event.details || '',
        prompt_excerpt: event.promptExcerpt || '',
        response_excerpt: event.responseExcerpt || '',
        metadata: event.metadata || {}
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`[SentraClient] Failed to log telemetry: ${response.status} ${err}`);
    }

    const raw = (await response.json()) as { status?: string; id?: string; success?: boolean };
    return { status: raw.status || 'logged', id: raw.id || '' };
  }

  /**
   * Triggers a deep scan of all connected data sources for policy violations.
   * Returns immediately — poll getScanStatus() to track progress.
   */
  async triggerScan(): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.baseUrl}/incidents/scan`, {
      method: 'POST',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`[SentraClient] Failed to trigger scan: ${response.status} ${err}`);
    }

    const raw = (await response.json()) as { success?: boolean; data?: { message: string }; message?: string };
    return {
      success: raw.success ?? true,
      message: raw.data?.message || raw.message || 'Deep scan initiated'
    };
  }

  /**
   * Polls the status of an ongoing or recently completed deep scan.
   */
  async getScanStatus(): Promise<ScanStatus> {
    const response = await fetch(`${this.baseUrl}/incidents/scan/status`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`[SentraClient] Failed to get scan status: ${response.status} ${err}`);
    }

    const raw = await response.json();
    const data =
      raw && typeof raw === 'object' && 'data' in raw
        ? (raw as { data: ScanStatus }).data
        : (raw as ScanStatus);
    return data as ScanStatus;
  }

  /**
   * Checks if an AI action is permitted based on current governance policies.
   * Returns a decision (allow/block), risk score, and reason.
   */
  async checkAction(params: { agent: string; action: string; metadata?: Record<string, any> }): Promise<{
    status: 'allowed' | 'blocked';
    risk_score: 'low' | 'medium' | 'high';
    reason?: string;
  }> {
    const response = await fetch(`${this.baseUrl}/ai/check-action`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`[SentraClient] Failed to check action: ${response.status} ${err}`);
    }

    const raw = (await response.json()) as { 
      success: boolean; 
      data: { status: 'allowed' | 'blocked'; risk_score: 'low' | 'medium' | 'high'; reason?: string } 
    };
    
    return raw.data;
  }
}

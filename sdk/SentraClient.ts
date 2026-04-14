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
    // Default to production backend on Render
    this.baseUrl = options.baseUrl || 'https://sentra-backend-node.onrender.com/api';
    this.apiKey = options.apiKey || '';
    this.backendBearerToken = options.backendBearerToken || '';
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

    const raw = await response.json();
    return (raw && typeof raw === 'object' && 'data' in raw ? (raw as { data: unknown }).data : raw) as {
      message: string;
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
}


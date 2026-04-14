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

export class SentraClient {
  private baseUrl: string;
  private apiKey: string;
  private backendBearerToken: string;

  constructor(options: { baseUrl?: string; apiKey?: string; backendBearerToken?: string } = {}) {
    this.baseUrl = options.baseUrl || 'https://sentra-backend-node.onrender.com/api';
    this.apiKey = options.apiKey || '';
    this.backendBearerToken = options.backendBearerToken || '';
  }

  /**
   * Logs an incident or telemetry event directly to the Sentra Governance Dashboard.
   * Useful for tracking LangChain trace steps or rogue agent actions.
   */
  async logEvent(event: TelemetryEvent): Promise<{ status: string, id: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/incidents/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.backendBearerToken ? `Bearer ${this.backendBearerToken}` : '',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify({
          agent_id: event.agentName,
          action: event.action,
          severity: event.severity,
          policy_id: event.policyId,
          details: event.details || "",
          prompt_excerpt: event.promptExcerpt || "",
          response_excerpt: event.responseExcerpt || "",
          metadata: event.metadata || {}
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to log telemetry: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("[Sentra AI] Telemetry failed to send:", error);
      throw error;
    }
  }
}

export interface SentraConfig {
  apiKey: string;
  baseUrl?: string;
  maxRetries?: number;
}

export interface ActionRequest {
  agent: string;
  action: string;
  metadata?: Record<string, any>;
}

export interface ActionResponse {
  status: 'allowed' | 'blocked';
  risk_score: 'low' | 'medium' | 'high';
  reason?: string;
  impact?: string;
  compliance?: Record<string, any>;
  explanation?: string;
}

export class SentraError extends Error {
  constructor(message: string, public readonly originalError?: any) {
    super(message);
    this.name = 'SentraError';
  }
}

export class Sentra {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly maxRetries: number;

  constructor(config: SentraConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || 'https://sentra-backend-node.onrender.com/api').replace(/\/$/, '');
    this.maxRetries = config.maxRetries ?? 3;
  }

  /**
   * Validates if an AI action is safe to execute against active policies.
   */
  async checkAction(request: ActionRequest): Promise<ActionResponse> {
    let lastError: any;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/ai/check-action`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify(request)
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API Error (${response.status}): ${errorText}`);
        }

        return await response.json();
      } catch (error: any) {
        lastError = error;
        if (attempt < this.maxRetries) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
          continue;
        }
      }
    }

    // Fail closed (block) if the security system is unreachable after retries
    console.warn(`[Sentra] Security check failed after ${this.maxRetries} retries. Failing closed.`, lastError);
    return {
      status: 'blocked',
      risk_score: 'high',
      reason: 'Governance system unreachable',
      impact: 'Execution prevented due to security timeout'
    };
  }

  /**
   * Helper wrapper to execute an action only if Sentra allows it.
   */
  async safeAction<T>(
    request: ActionRequest,
    onAllowed: () => Promise<T> | T
  ): Promise<{ success: boolean; result?: T; governance: ActionResponse }> {
    const governance = await this.checkAction(request);

    if (governance.status === 'allowed') {
      try {
        const result = await onAllowed();
        return { success: true, result, governance };
      } catch (error: any) {
        throw new SentraError('Action execution failed despite being allowed', error);
      }
    } else {
      console.warn(`[Sentra Blocked] Action: ${request.action}, Reason: ${governance.reason}`);
      return { success: false, governance };
    }
  }
}

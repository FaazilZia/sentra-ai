export interface SentraConfig {
  apiKey: string;
  baseUrl?: string;
  maxRetries?: number;
  timeout?: number;
}

export interface ActionRequest {
  agent: string;
  action: string;
  metadata?: Record<string, any>;
}

export interface ActionResponse {
  status: 'allowed' | 'blocked';
  risk: 'low' | 'medium' | 'high';
  reason: string;
  impact: string;
  compliance: string[];
  explanation?: string;
  confidence?: number;
}

export class SentraError extends Error {
  constructor(message: string, public readonly status?: number, public readonly data?: any) {
    super(message);
    this.name = 'SentraError';
  }
}

export class SentraClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly maxRetries: number;
  private readonly timeout: number;

  constructor(config: SentraConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || 'https://api.sentra.ai/api/v1').replace(/\/$/, '');
    this.maxRetries = config.maxRetries ?? 3;
    this.timeout = config.timeout ?? 5000;
  }

  /**
   * Validates if an AI action is safe to execute against active policies.
   */
  async checkAction(request: { action_type: string; payload: Record<string, any> }): Promise<ActionResponse> {
    let lastError: any;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(`${this.baseUrl}/guardrails/action`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify(request),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new SentraError(`API Error (${response.status})`, response.status, errorData);
        }

        const json = await response.json();
        // Backend returns { success, decision, reason }
        return {
          status: json.decision.toLowerCase(),
          risk: json.decision === 'BLOCK' ? 'high' : 'low',
          reason: json.reason || 'Processed by Sentra AI',
          impact: json.decision === 'BLOCK' ? 'Action prevented' : 'None',
          compliance: []
        };
      } catch (error: any) {
        clearTimeout(timeoutId);
        lastError = error;

        if (error.name === 'AbortError') {
          console.warn(`[Sentra] Request timed out (attempt ${attempt + 1})`);
        }

        if (attempt < this.maxRetries) {
          const delay = Math.pow(2, attempt) * 200;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
    }

    // Fail closed (block) if the security system is unreachable after retries
    console.error(`[Sentra] Security check failed after ${this.maxRetries} retries. Failing closed.`, lastError);
    return {
      status: 'blocked',
      risk: 'high',
      reason: 'Governance system unreachable or timed out',
      impact: 'Execution prevented to ensure safety',
      compliance: ['Safety Fallback']
    };
  }

  /**
   * Intercepts OpenAI requests to ensure safety.
   */
  wrapOpenAI(openaiClient: any) {
    const originalCreate = openaiClient.chat.completions.create.bind(openaiClient.chat.completions);

    openaiClient.chat.completions.create = async (...args: any[]) => {
      const params = args[0];
      const prompt = params.messages?.map((m: any) => m.content).join('\n') || '';

      const check = await this.checkAction({
        action_type: 'OPENAI_CHAT_COMPLETION',
        payload: { model: params.model, prompt_length: prompt.length, prompt: prompt.substring(0, 500) }
      });

      if (check.status === 'blocked') {
        throw new SentraError(`[Sentra Blocked] ${check.reason}`, 403, check);
      }

      return originalCreate(...args);
    };

    return openaiClient;
  }

  /**
   * Intercepts fetch calls to monitor and control external API access.
   */
  wrapFetch(originalFetch: typeof fetch) {
    return async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();
      const method = init?.method || 'GET';

      const check = await this.checkAction({
        action_type: 'API_CALL',
        payload: { url, method }
      });

      if (check.status === 'blocked') {
        throw new SentraError(`[Sentra Blocked] ${check.reason}`, 403, check);
      }

      return originalFetch(input, init);
    };
  }

  /**
   * Helper wrapper to execute an action only if Sentra allows it.
   */
  async safeAction<T>(
    request: { action_type: string; payload: Record<string, any> },
    onAllowed: () => Promise<T> | T
  ): Promise<{ success: boolean; result?: T; governance: ActionResponse }> {
    const governance = await this.checkAction(request);

    if (governance.status === 'allowed') {
      try {
        const result = await onAllowed();
        return { success: true, result, governance };
      } catch (error: any) {
        throw new SentraError('Action execution failed despite being allowed', 500, error);
      }
    } else {
      console.warn(`[Sentra Blocked] Action: ${request.action_type}, Reason: ${governance.reason}`);
      return { success: false, governance };
    }
  }
}


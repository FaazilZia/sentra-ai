import { apiRequest } from './api';

export interface ActionResponse {
  status: 'allowed' | 'blocked';
  risk_score: 'low' | 'medium' | 'high';
  reason?: string;
  impact?: string;
  compliance?: string[];
  explanation?: string;
  confidence?: number;
  timeline?: any[];
}

export interface ActionRequest {
  agent: string;
  action: string;
  metadata?: any;
}

export class SentraSDK {
  /**
   * Intercept and check if an AI action is safe to execute.
   */
  async checkAction(request: ActionRequest): Promise<ActionResponse> {
    try {
      const response = await apiRequest<any>('/ai/check-action', {
        method: 'POST',
        body: JSON.stringify(request)
      });
      return response;
    } catch (error) {
      console.error('SentraSDK Error:', error);
      // Fail closed (block) if the security system is unreachable
      return { 
        status: 'blocked', 
        risk_score: 'high', 
        reason: 'Security system unreachable',
        impact: 'Execution prevented due to security timeout'
      };
    }
  }

  /**
   * Helper wrapper to execute an action only if Sentra allows it.
   */
  async safeAction<T>(request: ActionRequest, onAllowed: () => Promise<T> | T) {
    const result = await this.checkAction(request);
    
    if (result.status === 'allowed') {
      const execResult = await onAllowed();
      return { success: true, result: execResult, governance: result };
    } else {
      console.warn(`[Sentra Blocked] Agent: ${request.agent}, Action: ${request.action}, Reason: ${result.reason}`);
      return { success: false, governance: result };
    }
  }
}

export const sentra = new SentraSDK();

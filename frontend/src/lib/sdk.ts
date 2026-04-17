import { apiRequest } from './api';

export interface ActionResponse {
  status: 'allowed' | 'blocked';
  risk_score: 'low' | 'medium' | 'high';
  reason?: string;
}

export class SentraSDK {
  /**
   * Intercept and check if an AI action is safe to execute.
   */
  async checkAction(agent: string, action: string, metadata: any = {}): Promise<ActionResponse> {
    try {
      const response = await apiRequest<any>('/ai/check-action', {
        method: 'POST',
        body: JSON.stringify({ agent, action, metadata })
      });
      return response;
    } catch (error) {
      console.error('SentraSDK Error:', error);
      // Fail closed (block) if the security system is unreachable
      return { 
        status: 'blocked', 
        risk_score: 'high', 
        reason: 'Security system unreachable' 
      };
    }
  }

  /**
   * Helper wrapper to execute an action only if Sentra allows it.
   */
  async safeAction(agent: string, action: string, metadata: any, onAllowed: () => void) {
    const result = await this.checkAction(agent, action, metadata);
    
    if (result.status === 'allowed') {
      onAllowed();
      return { success: true, ...result };
    } else {
      console.warn(`[Sentra Blocked] Agent: ${agent}, Action: ${action}, Reason: ${result.reason}`);
      return { success: false, ...result };
    }
  }
}

export const sentra = new SentraSDK();

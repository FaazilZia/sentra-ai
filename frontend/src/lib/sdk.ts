import { apiRequest } from './api';

export interface GovernanceDecision {
  status: 'allowed' | 'blocked';
  risk_score: 'low' | 'medium' | 'high';
  reason?: string;
  impact?: string;
  compliance?: string[];
  explanation?: string;
  isPendingApproval?: boolean;
}

/**
 * Sentra AI Governance SDK
 * Minimal, enterprise-grade AI compliance and control.
 */
export class Sentra {
  constructor(_config: { apiKey: string }) {
    // API Key is currently handled via Authorization headers in apiRequest
  }

  /**
   * Evaluates an AI action against enterprise compliance policies.
   * Uses a "Safe-Action" wrapper for minimal integration.
   * 
   * Example:
   * const sentra = new Sentra({ apiKey: 'sk_...' });
   * const result = await sentra.safeAction({ agent: 'SupportBot', action: 'Refund' }, () => executeRefund());
   */
  async safeAction<T>(
    params: { agent: string; action: string; metadata?: any }, 
    execute: () => Promise<T> | T
  ): Promise<{ success: boolean; data?: T; governance: GovernanceDecision }> {
    try {
      const decision = await apiRequest<GovernanceDecision>('/ai/check-action', {
        method: 'POST',
        body: JSON.stringify({
          agent: params.agent,
          action: params.action,
          metadata: params.metadata
        })
      });

      if (decision.status === 'allowed') {
        const data = await execute();
        return { success: true, data, governance: decision };
      }

      return { success: false, governance: decision };
    } catch (error) {
      // Enterprise safety: Fail-closed if governance engine is unreachable
      return { 
        success: false, 
        governance: { 
          status: 'blocked', 
          risk_score: 'high', 
          reason: 'Governance connection failure. Prevented action to ensure data safety.' 
        } 
      };
    }
  }
}

// Global instance for convenience
export const sentra = new Sentra({ apiKey: 'DEMO_KEY' });

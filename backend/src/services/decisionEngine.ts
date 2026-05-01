import crypto from 'crypto';
import { evaluateRisk } from './riskEngine';
import { evaluatePolicy } from './policyEngine';
import { evaluateSemanticRisk } from './semanticRiskEngine';
import { maskPII } from '../utils/masking';
import logger from '../utils/logger';
import { cacheService } from './cache.service';

export interface Decision {
  status: 'allowed' | 'blocked';
  risk: 'low' | 'medium' | 'high';
  reason: string;
  impact: string;
  compliance: string[];
  explanation?: string;
  confidence?: number;
  timeline?: any[];
  isPendingApproval?: boolean;
  degraded?: boolean;
}

const COMPLIANCE_MAP: Record<string, string[]> = {
  'send_email': ['GDPR'],
  'external_share': ['GDPR', 'HIPAA'],
  'read_pii': ['GDPR'],
  'export_csv': ['GDPR'],
  'delete_record': ['GDPR'],
  'read_phi': ['HIPAA'],
  'execute_payment': ['DPDP'],
  'update_config': ['Internal']
};

export const makeDecision = async (agent: string, action: string, organizationId: string, metadata: any = {}): Promise<Decision> => {
  const startTime = performance.now();
  
  try {
    // 1. Level 1: Policy Engine (Hard Rules)
    const policyResult = await evaluatePolicy(agent, action, organizationId);
    if (!policyResult.allowed) {
      return buildBlockedResponse('Policy Violation', policyResult, startTime, agent, action);
    }

    // 0. Safe-Action Short-circuit: If allowlist matched in L1, skip L2 and L3
    if (policyResult.reason === 'Action is on safe allowlist') {
      return {
        status: 'allowed',
        risk: 'low',
        reason: 'Safe action: bypassed governance evaluation',
        impact: 'None',
        compliance: [],
        explanation: 'Action is on the safe allowlist. No further evaluation needed.',
        confidence: 1.0,
        degraded: false,
        timeline: [
          { step: 'Allowlist', status: 'complete', icon: 'zap', description: 'Short-circuited' }
        ]
      };
    }

    // 2. Level 2: Local Risk Engine (Keyword/Pattern Pre-filter)
    const localRisk = evaluateRisk(action, metadata);
    
    // 3. Level 3: Semantic Risk Engine (Intent Analysis) with Redis Cache
    const actionHash = crypto.createHash('sha256').update(action).digest('hex');
    const cacheKey = `semantic:${actionHash}`;
    
    let semanticRisk;
    let degraded = false;

    try {
      semanticRisk = await cacheService.getOrSet(
        cacheKey,
        () => evaluateSemanticRisk(action),
        3600 // 1 hour TTL
      );

      // If the engine itself returned a failure result (fail-closed by default in evaluateSemanticRisk)
      // we want to fall back to L2 for actual governance if we want "degraded" mode.
      if (semanticRisk.categories?.includes('ENGINE_FAILURE')) {
        throw new Error('Semantic Engine returned failure');
      }
    } catch (error: any) {
      logger.warn('[GOVERNANCE] L3 Semantic Engine unavailable, falling back to L2:', error.message);
      degraded = true;
      semanticRisk = { 
        score: localRisk.score, // Fallback to L2
        explanation: 'Semantic analysis unavailable (Degraded Mode). Fallback to pattern matching.',
        confidence: 0.5,
        categories: ['DEGRADED']
      };
    }

    // Consolidated Risk Scoring (Highest Risk Wins)
    const riskScore = (localRisk.score === 'high' || semanticRisk.score === 'high') ? 'high' : 
                      (localRisk.score === 'medium' || semanticRisk.score === 'medium') ? 'medium' : 'low';

    let status: 'allowed' | 'blocked' = 'allowed';
    let reason = 'Allowed: Verified by multi-tier governance';
    let isPendingApproval = false;

    if (riskScore === 'high') {
      status = 'blocked';
      isPendingApproval = true;
      reason = semanticRisk.score === 'high' ? `Blocked: ${semanticRisk.explanation}` : 'Blocked: High-risk pattern detected';
    }

    const duration = performance.now() - startTime;
    console.log(`[GOVERNANCE] Decision: ${status.toUpperCase()} | Risk: ${riskScore} | Latency: ${duration.toFixed(2)}ms`);

    return {
      status,
      risk: riskScore,
      reason,
      impact: policyResult.impact || 'Protects system integrity',
      compliance: policyResult.compliance || ['Internal Policy'],
      explanation: maskPII(semanticRisk.explanation || 'Action aligns with safety boundaries.'),
      confidence: semanticRisk.confidence,
      isPendingApproval,
      degraded,
      timeline: [
        { step: 'L1: Policy', status: 'complete', icon: 'shield' },
        { step: 'L2: Pattern', status: 'complete', icon: 'zap' },
        { step: 'L3: Semantic', status: degraded ? 'warning' : 'complete', icon: 'brain', description: degraded ? 'Degraded Fallback' : undefined }
      ]
    };

  } catch (error: any) {
    logger.error('Decision Engine Critical Failure:', error);
    // FAIL-CLOSED
    return {
      status: 'blocked',
      risk: 'high',
      reason: 'Governance Failure: Internal Engine Error',
      impact: 'Critical System Protection',
      compliance: ['FAIL_SAFE'],
      explanation: 'The governance engine encountered a critical error. Blocking by default to prevent unauthorized data flow.'
    };
  }
};

const buildBlockedResponse = (type: string, policyResult: any, startTime: number, agent: string, action: string): Decision => {
  return {
    status: 'blocked',
    risk: 'high',
    reason: policyResult.reason || `${type}: Violation detected`,
    impact: policyResult.impact || 'Prevents unauthorized execution',
    compliance: policyResult.compliance || ['General Policy'],
    explanation: maskPII(policyResult.explanation || 'Action blocked by policy.'),
    confidence: 1.0,
    timeline: [
      { step: 'L1: Policy', status: 'blocked', icon: 'shield' },
      { step: 'Governance Engine', status: 'complete', icon: 'layers', description: 'Final Decision: BLOCKED' }
    ]
  };
};


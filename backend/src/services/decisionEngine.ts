import crypto from 'crypto';
import { evaluateRisk } from './riskEngine';
import { evaluatePolicy } from './policyEngine';
import { evaluateSemanticRisk } from './semanticRiskEngine';
import { SessionDetectionService } from './sessionDetection.service';
import { maskPII } from '../utils/masking';
import logger from '../utils/logger';
import { cacheService } from './cache.service';
import prisma from '../config/db';

const getNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export interface Decision {
  status: 'allowed' | 'blocked';
  risk: 'low' | 'medium' | 'high';
  mode?: 'FLAG_ONLY' | 'BLOCK';
  reason: string;
  impact: string;
  compliance: string[];
  explanation?: string;
  confidence?: number;
  timeline?: any[];
  isPendingApproval?: boolean;
  degraded?: boolean;
  detectionSource?: 'session_pattern' | 'behavioral_deviation' | 'memory_anomaly_heuristic' | 'multi_agent_correlation' | 'single_action';
  sessionRule?: string;
}

export const getAidrEnforcementMode = async (organizationId: string): Promise<'FLAG_ONLY' | 'BLOCK'> => {
  try {
    if (!organizationId) return 'BLOCK';
    const org = await prisma.organizations.findUnique({
      where: { id: organizationId },
      select: { aidrEnforcementMode: true }
    });
    return (org?.aidrEnforcementMode as 'FLAG_ONLY' | 'BLOCK') || 'BLOCK';
  } catch (err) {
    logger.warn('[GOVERNANCE] Failed to fetch aidrEnforcementMode, defaulting to BLOCK:', err);
    return 'BLOCK';
  }
};

export const makeDecision = async (agent: string, action: string, organizationId: string, metadata: any = {}): Promise<Decision> => {
  const startTime = getNow();
  
  try {
    const enforcementMode = await getAidrEnforcementMode(organizationId);

    // 1. Level 1: Policy Engine (Hard Rules)
    const policyResult = await evaluatePolicy(agent, action, organizationId);
    if (!policyResult.allowed) {
      if (enforcementMode === 'FLAG_ONLY') {
        logger.info(`[GOVERNANCE] FLAG_ONLY mode active: Flagging policy violation without blocking.`);
        return {
          status: 'allowed',
          risk: 'high',
          mode: 'FLAG_ONLY',
          reason: `[FLAG_ONLY MODE] Policy violation flagged: ${policyResult.reason || 'Policy violation detected'}`,
          impact: policyResult.impact || 'Policy violation flagged for review',
          compliance: policyResult.compliance || ['General Policy'],
          explanation: maskPII(policyResult.explanation || 'Action flagged in FLAG_ONLY mode.'),
          confidence: 1.0,
          degraded: false,
          timeline: [
            { step: 'L1: Policy', status: 'warning', icon: 'shield', description: 'Flagged (FLAG_ONLY)' }
          ]
        };
      }
      return buildBlockedResponse('Policy Violation', policyResult, startTime, agent, action, enforcementMode);
    }

    // 0. Safe-Action Short-circuit: If allowlist matched in L1, skip L2, L3, and session rules
    if (policyResult.reason === 'Action is on safe allowlist') {
      return {
        status: 'allowed',
        risk: 'low',
        mode: enforcementMode,
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

    // 2. Session Pattern & Sequence Detection (Detection Depth Lite)
    const sessionDetection = await SessionDetectionService.evaluateSessionPattern(agent, action, organizationId, metadata);
    if (sessionDetection && sessionDetection.detected) {
      // Record action into window before returning
      await SessionDetectionService.recordAction(agent, organizationId, action, metadata);

      // Determine framework compliance tags from agent posture findings & sensitive data classification
      const frameworkSet = new Set<string>(['AIDR_SESSION_SECURITY', 'AIDR_SEQUENCE_DETECTION']);
      try {
        const foundAgent = await prisma.agent.findFirst({
          where: { organizationId, OR: [{ id: agent }, { name: agent }] },
          include: { postureFindings: { select: { framework: true } } }
        });
        if (foundAgent && foundAgent.postureFindings.length > 0) {
          foundAgent.postureFindings.forEach(f => frameworkSet.add(f.framework));
        }
      } catch (err) {
        logger.warn('[GOVERNANCE] Failed to fetch agent posture findings for session detection compliance tags:', err);
      }

      const actLower = (action + ' ' + (sessionDetection.reason || '')).toLowerCase();
      if (actLower.includes('phi') || actLower.includes('patient') || actLower.includes('medical') || actLower.includes('health')) {
        frameworkSet.add('HIPAA');
      }
      if (actLower.includes('pii') || actLower.includes('customer') || actLower.includes('gdpr')) {
        frameworkSet.add('GDPR');
        frameworkSet.add('DPDP');
      }
      if (actLower.includes('card') || actLower.includes('pci')) {
        frameworkSet.add('PCI_DSS');
      }

      const sessionCompliance = Array.from(frameworkSet);

      if (enforcementMode === 'FLAG_ONLY') {
        logger.info(`[GOVERNANCE] Session pattern threat detected in FLAG_ONLY mode: ${sessionDetection.title}`);
        return {
          status: 'allowed',
          risk: 'high',
          mode: 'FLAG_ONLY',
          reason: `[FLAG_ONLY MODE] ${sessionDetection.reason}`,
          impact: 'Session-sequence threat flagged for review',
          compliance: sessionCompliance,
          explanation: maskPII(sessionDetection.reason || 'Cross-action threat sequence flagged.'),
          confidence: 0.95,
          degraded: false,
          detectionSource: sessionDetection.detectionSource || 'session_pattern',
          sessionRule: sessionDetection.rule,
          timeline: [
            { step: 'Session Pattern Analysis', status: 'warning', icon: 'activity', description: `${sessionDetection.rule} (FLAG_ONLY)` }
          ]
        };
      }

      return {
        status: 'blocked',
        risk: 'high',
        mode: 'BLOCK',
        reason: sessionDetection.reason || 'Blocked by session sequence threat rule',
        impact: 'Prevents multi-action exfiltration or scope probing sequence',
        compliance: sessionCompliance,
        explanation: maskPII(`Sequence-Based Detection: ${sessionDetection.title}. Action blocked to interrupt potential attack path.`),
        confidence: 0.95,
        isPendingApproval: true,
        degraded: false,
        detectionSource: sessionDetection.detectionSource || 'session_pattern',
        sessionRule: sessionDetection.rule,
        timeline: [
          { step: 'Session Pattern Analysis', status: 'blocked', icon: 'activity', description: `Blocked: ${sessionDetection.rule}` }
        ]
      };
    }

    // Record action into rolling window for future sequence evaluation
    await SessionDetectionService.recordAction(agent, organizationId, action, metadata);

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

      if (semanticRisk.categories?.includes('ENGINE_FAILURE')) {
        throw new Error('Semantic Engine returned failure');
      }
    } catch (error: any) {
      logger.warn('[GOVERNANCE] L3 Semantic Engine unavailable, falling back to L2:', error.message);
      degraded = true;
      semanticRisk = { 
        score: localRisk.score,
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
      if (enforcementMode === 'FLAG_ONLY') {
        status = 'allowed';
        reason = semanticRisk.score === 'high' 
          ? `[FLAG_ONLY MODE] High risk detected: ${semanticRisk.explanation}` 
          : '[FLAG_ONLY MODE] High-risk pattern detected';
      } else {
        status = 'blocked';
        isPendingApproval = true;
        reason = semanticRisk.score === 'high' ? `Blocked: ${semanticRisk.explanation}` : 'Blocked: High-risk pattern detected';
      }
    }

    const duration = getNow() - startTime;
    logger.info(`[GOVERNANCE] Decision: ${status.toUpperCase()} | Risk: ${riskScore} | Mode: ${enforcementMode} | Latency: ${duration.toFixed(2)}ms`);

    return {
      status,
      risk: riskScore,
      mode: enforcementMode,
      reason,
      impact: policyResult.impact || 'Protects system integrity',
      compliance: policyResult.compliance || ['Internal Policy'],
      explanation: maskPII(semanticRisk.explanation || 'Action aligns with safety boundaries.'),
      confidence: semanticRisk.confidence,
      isPendingApproval,
      degraded,
      detectionSource: 'single_action',
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
      mode: 'BLOCK',
      reason: 'Governance Failure: Internal Engine Error',
      impact: 'Critical System Protection',
      compliance: ['FAIL_SAFE'],
      explanation: 'The governance engine encountered a critical error. Blocking by default to prevent unauthorized data flow.'
    };
  }
};

const buildBlockedResponse = (type: string, policyResult: any, startTime: number, agent: string, action: string, mode: 'FLAG_ONLY' | 'BLOCK' = 'BLOCK'): Decision => {
  return {
    status: 'blocked',
    risk: 'high',
    mode,
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

import prisma from '../config/db';
import logger from '../utils/logger';
import { evaluateRisk } from './riskEngine';
import { evaluateSemanticRisk } from './semanticRiskEngine';

export interface GuardrailDecision {
  decision: 'ALLOW' | 'MODIFY' | 'BLOCK';
  confidence: 'High' | 'Medium' | 'Low';
  reason?: string;
  policy_triggered?: string;
  processedText: string;
}

const POLICIES = [
  {
    id: 'NO_PII_EXPOSURE',
    patterns: [
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, // Email
      /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // Phone (simple)
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
    ],
    action: 'MODIFY', // Redact by default, can be BLOCK
    description: 'Masks or blocks personal identifiable information'
  },
  {
    id: 'NO_PHI_EXPOSURE',
    patterns: [
      /\b(medical|patient|diagnosis|treatment|prescription)\b/gi,
      /\b\d{10,}\b/g, // Potential medical record IDs
    ],
    action: 'BLOCK',
    description: 'Blocks health insurance and patient records'
  },
  {
    id: 'PROMPT_INJECTION_DETECT',
    patterns: [
      /ignore previous instructions/gi,
      /system prompt/gi,
      /reveal secret/gi
    ],
    action: 'BLOCK',
    description: 'Detects and blocks prompt injection attempts'
  }
];

export class GuardrailService {
  static async evaluateInput(text: string): Promise<GuardrailDecision> {
    let decision: 'ALLOW' | 'MODIFY' | 'BLOCK' = 'ALLOW';
    let confidence: 'High' | 'Medium' | 'Low' = 'High';
    let reason = 'All policies passed';
    let policy_triggered: string | undefined = undefined;
    let processedText = text;

    // 1. Traditional Regex/Pattern Matching (Fast path)
    for (const policy of POLICIES) {
      for (const pattern of policy.patterns) {
        if (pattern.test(text)) {
          confidence = pattern.toString().includes('\\b') ? 'Medium' : 'High';

          if (policy.action === 'BLOCK') {
            return {
              decision: 'BLOCK',
              confidence,
              reason: `Policy ${policy.id} violation: sensitive patterns detected`,
              policy_triggered: policy.id,
              processedText: '[BLOCKED BY GUARDRAIL]'
            };
          } else if (policy.action === 'MODIFY') {
            decision = 'MODIFY';
            policy_triggered = policy.id;
            reason = `Sensitive data masked by policy ${policy.id}`;
            processedText = processedText.replace(pattern, (match) => {
              return match[0] + '***' + (match.includes('@') ? match.split('@')[1] : '');
            });
          }
        }
      }
    }

    // 2. Hardened Risk Engine (Normalization, Evasion, Multi-Signal)
    const engineResult = evaluateRisk('ai_proxy', { prompt: text });
    if (engineResult.score === 'high') {
      return {
        decision: 'BLOCK',
        confidence: 'High',
        reason: `Risk Engine: ${engineResult.triggers[0]}`,
        policy_triggered: 'HARDENED_RISK_ENGINE',
        processedText: '[BLOCKED BY SECURITY ENGINE]'
      };
    }

    // 3. Semantic Analysis (LLM Intent Analysis)
    // Only run for complex prompts to optimize latency
    if (text.length > 20 || /export|reveal|system|ignore/i.test(text)) {
      const semanticResult = await evaluateSemanticRisk(text);
      if (semanticResult.score === 'high') {
        return {
          decision: 'BLOCK',
          confidence: 'High',
          reason: `Semantic Guardrail: ${semanticResult.explanation}`,
          policy_triggered: 'SEMANTIC_ADVERSARIAL_DETECT',
          processedText: '[BLOCKED BY SEMANTIC GUARDRAIL]'
        };
      }
    }

    return { decision, confidence, reason, policy_triggered, processedText };
  }

  static async evaluateOutput(text: string): Promise<GuardrailDecision> {
    // Same logic as input for now, but usually more strict on leakage
    return await this.evaluateInput(text);
  }

  static async logInterception(data: {
    user_id: string;
    organizationId?: string;
    input_text: string;
    output_text?: string;
    decision: string;
    confidence?: string;
    reason?: string;
    policy_triggered?: string;
    metadata?: any;
  }) {
    try {
      return await (prisma as any).interception_logs.create({
        data: {
          user_id: data.user_id,
          organizationId: data.organizationId,
          input_text: data.input_text,
          output_text: data.output_text,
          decision: data.decision,
          confidence: data.confidence || 'High',
          reason: data.reason,
          policy_triggered: data.policy_triggered,
        metadata: { 
          ...data.metadata,
          categories: data.policy_triggered ? [data.policy_triggered] : (data.metadata?.categories || [])
        }
      }
    });
  } catch (err) {
      logger.error('Failed to log interception:', err);
    }
  }

  static async requestOverride(logId: string, userId: string, reason: string) {
    await (prisma as any).interception_logs.update({
      where: { id: logId },
      data: { override_status: 'pending' }
    });

    return await (prisma as any).guardrail_overrides.create({
      data: { log_id: logId, requested_by: userId, reason, status: 'pending' }
    });
  }

  static async approveOverride(overrideId: string, adminId: string, status: 'approved' | 'rejected') {
    const override = await (prisma as any).guardrail_overrides.update({
      where: { id: overrideId },
      data: { status, approved_by: adminId }
    });

    await (prisma as any).interception_logs.update({
      where: { id: override.log_id },
      data: { override_status: status }
    });

    return override;
  }

  static async getOverrides() {
    return await (prisma as any).guardrail_overrides.findMany({
      orderBy: { timestamp: 'desc' }
    });
  }

  static async getMetrics() {
    const logs = await (prisma as any).interception_logs.findMany();
    const total = logs.length;
    if (total === 0) return { total: 0, allowed: 100, blocked: 0, modified: 0 };

    const allowed = (logs.filter((l: any) => l.decision === 'ALLOW').length / total) * 100;
    const blocked = (logs.filter((l: any) => l.decision === 'BLOCK').length / total) * 100;
    const modified = (logs.filter((l: any) => l.decision === 'MODIFY').length / total) * 100;

    return { total, allowed, blocked, modified };
  }


  static async getInterceptionLogs(limit = 20) {
    return await (prisma as any).interception_logs.findMany({
      orderBy: { timestamp: 'desc' },
      take: limit
    });
  }
}

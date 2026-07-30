import { makeDecision } from '../services/decisionEngine';
import { enqueueLog } from '../services/queue.service';
import { alertService } from '../services/alert.service';
import { WorkflowService } from '../services/workflow.service';
import { PIIScannerService } from '../services/piiScanner.service';
import logger from '../utils/logger';

/**
 * Recursively redacts PII from any metadata structure.
 */
function redactMetadata(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    return PIIScannerService.scan(obj).redactedText;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => redactMetadata(item));
  }
  if (typeof obj === 'object') {
    const redacted: any = {};
    for (const key of Object.keys(obj)) {
      redacted[key] = redactMetadata(obj[key]);
    }
    return redacted;
  }
  return obj;
}

/**
 * Core interception layer for AI actions.
 * Ensures every action is evaluated against policy and risk before execution.
 */
export async function interceptAction(input: any, callback: () => Promise<any>) {
  const { agent, action, organizationId, metadata, requestId } = input;
  const startTime = Date.now();

  // Step 0: PII Scan
  const piiResult = PIIScannerService.scanPayload(action, metadata);

  // A. If high-risk PII is detected, short-circuit and block immediately
  if (piiResult.piiDetected && piiResult.riskLevel === 'high') {
    const decision = {
      status: 'blocked',
      risk: 'high',
      reason: 'Compliance Violation - Sensitive PII Detected',
      impact: 'Immediate block to prevent sensitive data leak',
      compliance: piiResult.violatedFrameworks,
      explanation: `Action blocked due to detection of high-risk sensitive data: ${piiResult.detectedCategories.join(', ')}.`
    };

    // Async alerting (fire and forget)
    alertService.notify(organizationId, decision, agent, piiResult.redactedText);

    await enqueueLog({
      organizationId,
      agent,
      action: piiResult.redactedText, // redacted action
      status: decision.status,
      risk: decision.risk,
      reason: decision.reason,
      impact: decision.impact,
      compliance: decision.compliance,
      metadata: redactMetadata({
        ...metadata,
        piiDetected: true,
        violatedFrameworks: piiResult.violatedFrameworks,
        detectedCategories: piiResult.detectedCategories
      }),
      requestId,
      latency: Date.now() - startTime,
      isPendingApproval: false,
      explanation: decision.explanation,
      emitRealtime: false,
    });

    return decision;
  }

  // 1. Get Decision from Engine with Global Fail-Closed Boundary
  let decision: any;
  try {
    decision = await makeDecision(agent, action, organizationId, metadata);
  } catch (error: any) {
    // FAIL-CLOSED: Critical engine error defaults to BLOCKED
    decision = {
      status: 'blocked',
      risk: 'high',
      reason: 'Critical Governance Failure',
      impact: 'Protected by Fail-Closed Boundary',
      compliance: ['INTERNAL_SAFETY'],
      explanation: 'The governance engine encountered a critical error. Action blocked for safety.'
    };
  }

  // B. If PII is detected (medium-risk here), update decision metadata
  if (piiResult.piiDetected) {
    if (decision.risk === 'low') {
      decision.risk = 'medium';
    }
    const existingCompliance = Array.isArray(decision.compliance) ? decision.compliance : [];
    const complianceSet = new Set([...existingCompliance, ...piiResult.violatedFrameworks]);
    decision.compliance = Array.from(complianceSet);
  }

  // 2. If blocked, log and return early
  if (decision.status === 'blocked') {
    // Async alerting (fire and forget)
    alertService.notify(organizationId, decision, agent, piiResult.redactedText);

    if (decision.isPendingApproval) {
      await WorkflowService.createPendingWorkflowTask(organizationId, agent, piiResult.redactedText, decision, redactMetadata(metadata)).catch(err => {
        logger.error('[Interceptor] Failed to create pending workflow task:', err);
      });
    }

    await enqueueLog({
      organizationId,
      agent,
      action: piiResult.redactedText, // redacted action
      status: decision.status,
      risk: decision.risk,
      reason: decision.reason,
      impact: decision.impact,
      compliance: decision.compliance,
      metadata: redactMetadata({
        ...metadata,
        detectionSource: decision.detectionSource || 'single_action',
        sessionRule: decision.sessionRule,
        ...(piiResult.piiDetected ? {
          piiDetected: true,
          violatedFrameworks: piiResult.violatedFrameworks,
          detectedCategories: piiResult.detectedCategories
        } : {})
      }),
      requestId,
      latency: Date.now() - startTime,
      isPendingApproval: decision.isPendingApproval || false,
      explanation: decision.explanation,
      emitRealtime: false,
    });
    return decision;
  }

  // 3. Execute the actual action (callback)
  let result;
  try {
    result = await callback();
  } catch (error: any) {
    result = { error: error.message };
  }

  // 4. Log the allowed action result asynchronously
  await enqueueLog({
    organizationId,
    agent,
    action: piiResult.redactedText, // redacted action
    status: decision.status,
    risk: decision.risk,
    reason: decision.reason,
    impact: decision.impact,
    compliance: decision.compliance,
    metadata: redactMetadata({
      ...metadata,
      result,
      ...(piiResult.piiDetected ? {
        piiDetected: true,
        violatedFrameworks: piiResult.violatedFrameworks,
        detectedCategories: piiResult.detectedCategories
      } : {})
    }),
    requestId,
    latency: Date.now() - startTime,
    explanation: decision.explanation,
    emitRealtime: false,
  });

  return {
    ...decision,
    result
  };
}


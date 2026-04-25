import { makeDecision } from '../services/decisionEngine';
import { enqueueLog } from '../services/queue.service';

/**
 * Core interception layer for AI actions.
 * Ensures every action is evaluated against policy and risk before execution.
 */
export async function interceptAction(input: any, callback: () => Promise<any>) {
  const { agent, action, organizationId, metadata, requestId } = input;
  const startTime = Date.now();

  // 1. Get Decision from Engine with Global Fail-Closed Boundary
  let decision;
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

  // 2. If blocked, log and return early
  if (decision.status === 'blocked') {
    await enqueueLog({
      organizationId,
      agent,
      action,
      status: decision.status,
      risk: decision.risk,
      reason: decision.reason,
      impact: decision.impact,
      compliance: decision.compliance,
      metadata,
      requestId,
      latency: Date.now() - startTime,
      isPendingApproval: decision.isPendingApproval || false,
      explanation: decision.explanation
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
    action,
    status: decision.status,
    risk: decision.risk,
    reason: decision.reason,
    impact: decision.impact,
    compliance: decision.compliance,
    metadata: { ...metadata, result },
    requestId,
    latency: Date.now() - startTime,
    explanation: decision.explanation
  });

  return {
    ...decision,
    result
  };
}


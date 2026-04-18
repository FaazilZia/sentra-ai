import { makeDecision } from '../services/decisionEngine';
import { enqueueLog } from '../services/queue.service';

/**
 * Core interception layer for AI actions.
 * Ensures every action is evaluated against policy and risk before execution.
 */
export async function interceptAction(input: any, callback: () => Promise<any>) {
  const { agent, action, companyId, metadata, requestId } = input;
  const startTime = Date.now();

  // 1. Get Decision from Engine
  const decision = await makeDecision(agent, action, companyId, metadata);

  // 2. If blocked, log asynchronously and return early
  if (decision.status === 'blocked') {
    await enqueueLog({
      companyId,
      agent,
      action,
      status: decision.status,
      risk: decision.risk,
      reason: decision.reason,
      impact: decision.impact,
      compliance: decision.compliance,
      metadata,
      requestId,
      latency: Date.now() - startTime
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
    companyId,
    agent,
    action,
    status: decision.status,
    risk: decision.risk,
    reason: decision.reason,
    impact: decision.impact,
    compliance: decision.compliance,
    metadata: { ...metadata, result },
    requestId,
    latency: Date.now() - startTime
  });

  return {
    ...decision,
    result
  };
}


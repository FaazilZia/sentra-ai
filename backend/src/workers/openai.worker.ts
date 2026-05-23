import { makeDecision } from '../services/decisionEngine';
import prisma from '../config/db';
import logger from '../utils/logger';

/**
 * OpenAI SDK call wrapper for governance enforcement.
 * Evaluates the prompt input using makeDecision, blocks on violations,
 * logs execution details to interception_logs, and updates logs with response content.
 */
export const wrapOpenAIChatCompletion = async (
  openaiClientCall: () => Promise<any>,
  inputPrompt: string,
  organizationId: string,
  agentName: string = 'openai-agent'
): Promise<any> => {
  logger.info(`[OpenAI Governance] Intercepting chat completion. Prompt preview: "${inputPrompt.slice(0, 100)}..."`);

  // 1. Pre-execution Governance Evaluation
  const decision = await makeDecision(agentName, 'openai_chat_completion', organizationId, { prompt: inputPrompt });

  // 2. Persist audit evidence to interception_logs
  const log = await prisma.interception_logs.create({
    data: {
      user_id: 'system_openai_client',
      organizationId,
      input_text: inputPrompt,
      decision: decision.status === 'blocked' ? 'BLOCK' : 'ALLOW',
      confidence: 'High',
      reason: decision.reason,
      policy_triggered: decision.compliance.join(', ') || 'OpenAI Baseline Policy',
      metadata: { agentName, riskLevel: decision.risk },
      timestamp: new Date(),
    },
  });

  // 3. Prevent execution on blocked decisions
  if (decision.status === 'blocked') {
    logger.warn(`[OpenAI Governance] Chat completion BLOCKED: ${decision.reason}`);
    throw new Error(`Execution Blocked by Sentra AI Governance: ${decision.reason}`);
  }

  logger.info(`[OpenAI Governance] Chat completion ALLOWED. Executing OpenAI request...`);

  // 4. Run real OpenAI request
  const response = await openaiClientCall();

  // 5. Update audit log with response content (output_text)
  const outputText = response.choices?.[0]?.message?.content || null;
  await prisma.interception_logs.update({
    where: { id: log.id },
    data: { output_text: outputText },
  });

  logger.info(`[OpenAI Governance] Request processed successfully and logged.`);
  return response;
};

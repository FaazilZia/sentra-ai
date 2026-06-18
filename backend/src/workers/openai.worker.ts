import OpenAI from 'openai';
import { makeDecision } from '../services/decisionEngine';
import prisma from '../config/db';
import logger from '../utils/logger';

export const wrapOpenAIChatCompletion = async (
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  organizationId: string,
  agentName: string = 'openai-agent',
  apiKey?: string
): Promise<string> => {
  const inputPrompt = messages.map(m => m.content).join(' | ');
  logger.info(`[OpenAI Governance] Intercepting chat completion for org: ${organizationId}`);

  const decision = await makeDecision(agentName, 'openai_chat_completion', organizationId, { prompt: inputPrompt });

  const log = await prisma.interception_logs.create({
    data: {
      user_id: `agent_${agentName}`,
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

  if (decision.status === 'blocked') {
    logger.warn(`[OpenAI Governance] BLOCKED: ${decision.reason}`);
    throw new Error(`Execution Blocked by Sentraa AI Governance: ${decision.reason}`);
  }

  // Real OpenAI API call
  const resolvedKey = apiKey || process.env.OPENAI_API_KEY;
  if (!resolvedKey) throw new Error('No OpenAI API key configured');

  const client = new OpenAI({ apiKey: resolvedKey });
  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
  });

  const responseText = completion.choices[0]?.message?.content || '';

  // Update log with response
  await prisma.interception_logs.update({
    where: { id: log.id },
    data: { metadata: { agentName, riskLevel: decision.risk, response_preview: responseText.slice(0, 200) } },
  });

  logger.info(`[OpenAI Governance] ALLOWED — tokens used: ${completion.usage?.total_tokens}`);
  return responseText;
};

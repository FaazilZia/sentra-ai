import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { makeDecision } from '../services/decisionEngine';
import prisma from '../config/db';
import logger from '../utils/logger';

export class LangChainGovernanceHandler {
  private organizationId: string;
  private agentName: string;

  constructor(organizationId: string, agentName: string = 'langchain-agent') {
    this.organizationId = organizationId;
    this.agentName = agentName;
  }

  async handleToolStart(tool: { name: string; description?: string }, input: string, runId: string): Promise<void> {
    logger.info(`[LangChain Governance] Intercepting tool "${tool.name}"`);
    const decision = await makeDecision(this.agentName, tool.name, this.organizationId, { input, runId });

    await prisma.interception_logs.create({
      data: {
        user_id: `langchain_${this.agentName}`,
        organizationId: this.organizationId,
        input_text: input,
        decision: decision.status === 'blocked' ? 'BLOCK' : 'ALLOW',
        confidence: 'High',
        reason: decision.reason,
        policy_triggered: decision.compliance.join(', ') || 'LangChain Baseline Policy',
        metadata: { runId, toolName: tool.name, riskLevel: decision.risk },
        timestamp: new Date(),
      },
    });

    if (decision.status === 'blocked') {
      throw new Error(`Execution Blocked by Sentra AI Governance: ${decision.reason}`);
    }
  }

  // Factory: create a governed LangChain ChatOpenAI instance
  async createGovernedLLM(apiKey?: string): Promise<ChatOpenAI> {
    const resolvedKey = apiKey || process.env.OPENAI_API_KEY;
    if (!resolvedKey) throw new Error('No OpenAI API key configured');
    return new ChatOpenAI({ openAIApiKey: resolvedKey, modelName: 'gpt-4o-mini', temperature: 0 });
  }

  async chat(userMessage: string, systemPrompt?: string, apiKey?: string): Promise<string> {
    await this.handleToolStart({ name: 'langchain_chat' }, userMessage, `run_${Date.now()}`);

    const llm = await this.createGovernedLLM(apiKey);
    const messages = systemPrompt
      ? [new SystemMessage(systemPrompt), new HumanMessage(userMessage)]
      : [new HumanMessage(userMessage)];

    const response = await llm.invoke(messages);
    return typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
  }
}

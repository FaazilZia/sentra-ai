import { makeDecision } from '../services/decisionEngine';
import prisma from '../config/db';
import logger from '../utils/logger';

/**
 * LangChain Governance Callback Handler.
 * Intercepts tool execution starts, runs standard governance evaluation via makeDecision,
 * logs to interception_logs, and prevents execution on failure.
 */
export class LangChainGovernanceHandler {
  private organizationId: string;
  private agentName: string;

  constructor(organizationId: string, agentName: string = 'langchain-agent') {
    this.organizationId = organizationId;
    this.agentName = agentName;
  }

  /**
   * Called before a tool is executed.
   */
  async handleToolStart(tool: { name: string; description?: string }, input: string, runId: string): Promise<void> {
    logger.info(`[LangChain Governance] Intercepting tool "${tool.name}" with input: "${input.slice(0, 100)}..."`);

    // 1. Evaluate safety/compliance via the decision engine
    const decision = await makeDecision(this.agentName, tool.name, this.organizationId, { input, runId });

    // 2. Persist audit evidence to interception_logs
    await prisma.interception_logs.create({
      data: {
        id: undefined, // auto-generated UUID
        user_id: 'system_langchain_agent',
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

    // 3. Block execution in the LangChain runtime if policy dictates
    if (decision.status === 'blocked') {
      logger.warn(`[LangChain Governance] Execution BLOCKED for tool "${tool.name}": ${decision.reason}`);
      throw new Error(`Execution Blocked by Sentra AI Governance: ${decision.reason}`);
    }

    logger.info(`[LangChain Governance] Execution ALLOWED for tool "${tool.name}"`);
  }
}

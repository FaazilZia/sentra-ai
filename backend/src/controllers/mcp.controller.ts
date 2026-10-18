import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../config/db';
import logger from '../utils/logger';
import { makeDecision } from '../services/decisionEngine';
import { McpAgentKeyService } from '../services/mcpAgentKey.service';
import { alertPipeline } from '../services/alertPipeline.service';
import { PIIScannerService } from '../services/piiScanner.service';

const getNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export class McpController {
  /**
   * Helper to format standard JSON-RPC 2.0 error responses
   */
  private static sendJsonRpcError(res: Response, code: number, message: string, id: any = null, data?: any) {
    return res.status(200).json({
      jsonrpc: '2.0',
      error: {
        code,
        message,
        ...(data ? { data } : {}),
      },
      id,
    });
  }

  /**
   * Main JSON-RPC 2.0 handler over HTTP
   */
  static async handleJsonRpc(req: Request, res: Response): Promise<any> {
    const requestBody = req.body;
    const requestId = requestBody?.id ?? null;

    try {
      // 1. Basic JSON-RPC 2.0 parsing and verification
      if (!requestBody || typeof requestBody !== 'object') {
        return McpController.sendJsonRpcError(res, -32700, 'Parse error', null);
      }

      if (requestBody.jsonrpc !== '2.0') {
        return McpController.sendJsonRpcError(res, -32600, 'Invalid Request (missing jsonrpc version)', requestId);
      }

      const method = requestBody.method;
      if (typeof method !== 'string') {
        return McpController.sendJsonRpcError(res, -32600, 'Invalid Request (missing method)', requestId);
      }

      // 2. Route method calls
      switch (method) {
        case 'initialize':
          return McpController.handleInitialize(req, res, requestId);
        
        case 'tools/list':
          return McpController.handleToolsList(req, res, requestId);

        case 'tools/call':
          return McpController.handleToolsCall(req, res, requestId);

        default:
          return McpController.sendJsonRpcError(res, -32601, `Method not found: ${method}`, requestId);
      }
    } catch (error: any) {
      logger.error('[MCP-RPC] Unhandled exception in JSON-RPC processor:', error);
      // FAIL-CLOSED: Return JSON-RPC error
      return McpController.sendJsonRpcError(
        res,
        -32603,
        'Internal JSON-RPC error (fail-closed)',
        requestId,
        { reason: 'An unhandled exception occurred within the governance gateway' }
      );
    }
  }

  /**
   * Handles the 'initialize' method
   */
  private static handleInitialize(req: Request, res: Response, id: any) {
    const sessionId = crypto.randomUUID();
    res.setHeader('Mcp-Session-Id', sessionId);

    return res.status(200).json({
      jsonrpc: '2.0',
      result: {
        protocolVersion: '2025-03-26',
        capabilities: {
          tools: {
            listChanged: true,
          },
        },
        serverInfo: {
          name: 'Sentraa MCP Gateway',
          version: '1.0.0',
        },
      },
      id,
    });
  }

  /**
   * Authenticates the request via Bearer token
   */
  private static async getAuthenticatedAgent(req: Request): Promise<any> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing or malformed Authorization header');
    }

    const rawKey = authHeader.split(' ')[1];
    return await McpAgentKeyService.authenticateAgentKey(rawKey);
  }

  /**
   * Helper to write records to mcp_audit_logs securely
   */
  private static async logMcpAudit(agent: any, toolName: string, args: any, decisionStatus: string, riskLevel: string, reason: string, durationMs: number) {
    try {
      const redactedArgs = PIIScannerService.redactDeep(args);
      const inputSummary = JSON.stringify(redactedArgs);
      await prisma.mcp_audit_logs.create({
        data: {
          organizationId: agent.organizationId,
          agentKeyId: agent.agentKeyId,
          tool_name: toolName,
          input_summary: inputSummary.length > 1000 ? inputSummary.substring(0, 1000) + '...' : inputSummary,
          decision: decisionStatus,
          risk_level: riskLevel,
          reason: reason,
          duration_ms: durationMs,
        },
      });
    } catch (logErr) {
      logger.error('[MCP-RPC] Failed to write to mcp_audit_logs:', logErr);
    }
  }

  /**
   * Handles the 'tools/list' method
   */
  private static async handleToolsList(req: Request, res: Response, id: any): Promise<any> {
    try {
      const agent = await McpController.getAuthenticatedAgent(req);
      
      const SENTRA_TOOLS = [
        {
          name: 'sentra.checkAction',
          description: 'Evaluate any AI agent action through Sentraa governance before execution. Returns allowed or blocked with risk level and reason.',
          inputSchema: {
            type: 'object',
            properties: {
              action: { type: 'string', description: 'The action the agent wants to perform' },
              metadata: { type: 'object', description: 'Additional context about the action' }
            },
            required: ['action']
          }
        },
        {
          name: 'sentra.scanPII',
          description: 'Scan a text payload for personally identifiable information (PII) before sending to an LLM or external service. Returns detected PII categories and a redacted version of the text.',
          inputSchema: {
            type: 'object',
            properties: {
              text: { type: 'string', description: 'The text to scan for PII' }
            },
            required: ['text']
          }
        },
        {
          name: 'sentra.checkPolicy',
          description: 'Check whether a specific agent action is permitted under the organization active policies. Returns the policy decision with compliance framework references.',
          inputSchema: {
            type: 'object',
            properties: {
              agent: { type: 'string', description: 'The agent identifier' },
              action: { type: 'string', description: 'The action to check against policies' }
            },
            required: ['agent', 'action']
          }
        },
        {
          name: 'sentra.logAuditEvent',
          description: 'Log a custom audit event to the Sentraa governance audit trail. Use this to record significant agent decisions or actions for compliance evidence.',
          inputSchema: {
            type: 'object',
            properties: {
              event: { type: 'string', description: 'The audit event name' },
              details: { type: 'object', description: 'Additional details about the event' }
            },
            required: ['event']
          }
        },
        {
          name: 'sentra.getRiskScore',
          description: 'Get the current risk score for a given action string without blocking execution. Useful for monitoring and dashboards.',
          inputSchema: {
            type: 'object',
            properties: {
              action: { type: 'string', description: 'The action to score' }
            },
            required: ['action']
          }
        }
      ];

      // Filter based on agent allowed_tools / blocked_tools (ACL checks)
      const allowed = agent.allowedTools;
      const blocked = agent.blockedTools;

      const filteredTools = SENTRA_TOOLS.filter((tool) => {
        // If allowedTools is non-empty, tool must be in it
        if (allowed && allowed.length > 0 && !allowed.includes(tool.name)) {
          return false;
        }
        // Tool must not be in blockedTools
        if (blocked && blocked.includes(tool.name)) {
          return false;
        }
        return true;
      });

      return res.status(200).json({
        jsonrpc: '2.0',
        result: {
          tools: filteredTools,
        },
        id,
      });
    } catch (err: any) {
      logger.warn('[MCP-RPC] tools/list authentication failed:', err.message);
      return McpController.sendJsonRpcError(res, -32000, 'Unauthorized', id);
    }
  }

  /**
   * Handles the 'tools/call' method
   */
  private static async handleToolsCall(req: Request, res: Response, id: any): Promise<any> {
    const startTime = getNow();
    let agent: any = null;
    let toolName = '';
    let args: any = {};

    try {
      // 1. Authenticate agent key
      try {
        agent = await McpController.getAuthenticatedAgent(req);
      } catch (authErr: any) {
        logger.warn('[MCP-RPC] tools/call authentication failed:', authErr.message);
        return McpController.sendJsonRpcError(res, -32000, 'Unauthorized', id);
      }

      const params = req.body.params;
      toolName = params?.name || params?.tool_name;
      args = params?.arguments || {};

      if (!toolName) {
        return McpController.sendJsonRpcError(res, -32602, 'Invalid params: missing tool name', id);
      }

      // 2. Check ACL limits
      const allowed = agent.allowedTools;
      const blocked = agent.blockedTools;

      const isAllowedByAcl = allowed && allowed.length > 0 ? allowed.includes(toolName) : true;
      const isBlockedByAcl = blocked && blocked.includes(toolName);

      if (!isAllowedByAcl || isBlockedByAcl) {
        logger.warn(`[MCP-RPC] Tool ACL Block: tool="${toolName}" key="${agent.agentKeyId}"`);
        return McpController.sendJsonRpcError(res, -32001, 'Tool not permitted by agent key ACL', id);
      }

      // 3. Route to specific tool logic
      let toolResult: any;
      let decisionStatus = 'allowed';
      let riskLevel = 'low';
      let decisionReason = 'Success';

      if (toolName === 'sentra.checkAction') {
        const decision = await makeDecision(
          agent.agentKeyId,
          args.action || '',
          agent.organizationId,
          args.metadata || {}
        );
        decisionStatus = decision.status;
        riskLevel = decision.risk;
        decisionReason = decision.reason || '';
        toolResult = {
          status: decision.status,
          reason: decision.reason,
        };

        if (decision.status === 'blocked' || decision.status === 'flagged') {
          const durationMs = Math.round(getNow() - startTime);
          const rawAction = args.action || '';
          const redactedAction = PIIScannerService.redact(rawAction);
          const redactedArgs = PIIScannerService.redactDeep(args);

          await McpController.logMcpAudit(agent, toolName, redactedArgs, decisionStatus, riskLevel, decisionReason, durationMs);
          
          // 1. Dispatch through unified alert pipeline (Slack Block Kit, Email, etc.)
          try {
            await alertPipeline.dispatchDecisionAlert({
              organizationId: agent.organizationId,
              agent: agent.name || agent.agentKeyId,
              action: redactedAction || 'Unknown tool action',
              status: decision.status,
              risk: decision.risk,
              reason: decision.reason,
              compliance: decision.compliance,
              matchedPolicy: decision.matchedPolicy,
              ruleId: decision.ruleId,
              mode: decision.mode,
              source: 'mcp'
            });
          } catch (alertErr) {
            logger.error('[MCP-RPC] Failed to dispatch decision to alert pipeline:', alertErr);
          }

          // 2. Auto-create incident on high-risk BLOCKED action
          if (decision.status === 'blocked' && decision.risk === 'high') {
            const incidentId = crypto.randomUUID();
            await prisma.incidents.create({
              data: {
                id: incidentId,
                organizationId: agent.organizationId,
                agent_id: agent.agentKeyId,
                severity: 85,
                action: redactedAction || 'MCP Action',
                details: decision.reason || 'Action blocked by MCP Governance Gateway',
                prompt_excerpt: (redactedAction || '').slice(0, 500),
                response_excerpt: 'ACTION_BLOCKED',
                event_metadata: {
                  toolName,
                  agentKeyId: agent.agentKeyId,
                  agentName: agent.name,
                  matchedPolicy: decision.matchedPolicy,
                  compliance: decision.compliance,
                  args: redactedArgs
                },
                status: 'unresolved'
              }
            }).catch(err => logger.error('[MCP-RPC] Failed to create incident for blocked action:', err));
          }

          // 3. Record in interception_logs for dashboard & live block feed
          await prisma.interception_logs.create({
            data: {
              user_id: agent.agentKeyId,
              organizationId: agent.organizationId,
              input_text: `[MCP:${toolName}] ${redactedAction || ''}`,
              decision: decision.status === 'blocked' ? 'BLOCK' : 'FLAG',
              confidence: 'High',
              reason: decision.reason || 'Action blocked by Sentraa governance',
              policy_triggered: decision.matchedPolicy || 'MCP Guardrail Policy',
              metadata: {
                source: 'mcp',
                agentKeyId: agent.agentKeyId,
                agentName: agent.name,
                toolName,
                args: redactedArgs
              },
              timestamp: new Date()
            }
          }).catch(err => logger.error('[MCP-RPC] Failed to record interception log:', err));

          logger.warn(`[MCP-RPC] Decision Blocked: tool="${toolName}" reason="${decision.reason}" latency=${durationMs}ms`);
          return McpController.sendJsonRpcError(
            res,
            -32002,
            'Action blocked by Sentraa governance',
            id,
            { reason: decision.reason }
          );
        }
      } else if (toolName === 'sentra.scanPII') {
        const { PIIScannerService } = require('../services/piiScanner.service');
        const scanResult = PIIScannerService.scanPayload(args.text || '', {});
        toolResult = scanResult;
        decisionStatus = 'allowed';
        riskLevel = scanResult.riskLevel;
        decisionReason = scanResult.piiDetected ? 'PII detected in payload' : 'No PII detected';
      } else if (toolName === 'sentra.checkPolicy') {
        const { evaluatePolicy } = require('../services/policyEngine');
        const policyResult = await evaluatePolicy(agent.agentKeyId, args.action || '', agent.organizationId);
        toolResult = policyResult;
        decisionStatus = policyResult.allowed ? 'allowed' : 'blocked';
        riskLevel = policyResult.allowed ? 'low' : 'high';
        decisionReason = policyResult.reason || 'Policy evaluation completed';

        if (!policyResult.allowed) {
          const durationMs = Math.round(getNow() - startTime);
          const rawAction = args.action || '';
          const redactedAction = PIIScannerService.redact(rawAction);
          const redactedArgs = PIIScannerService.redactDeep(args);

          await McpController.logMcpAudit(agent, toolName, redactedArgs, decisionStatus, riskLevel, decisionReason, durationMs);
          
          try {
            await alertPipeline.dispatchDecisionAlert({
              organizationId: agent.organizationId,
              agent: agent.name || agent.agentKeyId,
              action: redactedAction || 'Unknown tool action',
              status: 'blocked',
              risk: 'high',
              reason: policyResult.reason || 'Policy evaluation violation',
              policyName: policyResult.matchedPolicy,
              source: 'mcp'
            });
          } catch (alertErr) {
            logger.error('[MCP-RPC] Failed to dispatch policy block to alert pipeline:', alertErr);
          }

          logger.warn(`[MCP-RPC] Policy Blocked: tool="${toolName}" reason="${policyResult.reason}" latency=${durationMs}ms`);
          return McpController.sendJsonRpcError(
            res,
            -32002,
            'Action blocked by Sentraa governance',
            id,
            { reason: policyResult.reason }
          );
        }
      } else if (toolName === 'sentra.logAuditEvent') {
        const { auditLogger } = require('../utils/auditLogger');
        await auditLogger.log({
          userId: agent.agentKeyId,
          organizationId: agent.organizationId,
          action: args.event || 'custom_mcp_event',
          metadata: args.details || {}
        });
        toolResult = { logged: true };
        decisionStatus = 'allowed';
        riskLevel = 'low';
        decisionReason = 'Audit event logged';
      } else if (toolName === 'sentra.getRiskScore') {
        const { evaluateRisk } = require('../services/riskEngine');
        const riskResult = evaluateRisk(args.action || '', {});
        toolResult = riskResult;
        decisionStatus = 'allowed';
        riskLevel = riskResult.score;
        decisionReason = `Risk evaluation score: ${riskResult.score}`;
      } else {
        return McpController.sendJsonRpcError(res, -32601, `Tool not found: ${toolName}`, id);
      }

      const durationMs = Math.round(getNow() - startTime);

      // 4. Log evaluation to mcp_audit_logs
      await McpController.logMcpAudit(agent, toolName, args, decisionStatus, riskLevel, decisionReason, durationMs);

      logger.info(`[MCP-RPC] Decision Allowed: tool="${toolName}" latency=${durationMs}ms`);
      return res.status(200).json({
        jsonrpc: '2.0',
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(toolResult),
            },
          ],
        },
        id,
      });

    } catch (error: any) {
      logger.error('[MCP-RPC] Critical error in tools/call execution:', error);

      // Fail-closed logging attempt
      const durationMs = Math.round(getNow() - startTime);
      if (agent) {
        try {
          await prisma.mcp_audit_logs.create({
            data: {
              organizationId: agent.organizationId,
              agentKeyId: agent.agentKeyId,
              tool_name: toolName || 'unknown',
              input_summary: JSON.stringify(PIIScannerService.redactDeep(args)),
              decision: 'blocked',
              risk_level: 'high',
              reason: 'Internal Governance Failure (Fail-Closed)',
              duration_ms: durationMs,
            },
          });
        } catch (dbErr) {
          logger.error('[MCP-RPC] Fail-closed DB log failed:', dbErr);
        }
      }

      return McpController.sendJsonRpcError(
        res,
        -32002,
        'Action blocked by Sentraa governance',
        id,
        { reason: 'Internal governance system error (fail-closed)' }
      );
    }
  }
}

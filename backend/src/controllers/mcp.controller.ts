import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../config/db';
import logger from '../utils/logger';
import { makeDecision } from '../services/decisionEngine';
import { McpAgentKeyService } from '../services/mcpAgentKey.service';

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
          name: 'Sentra MCP Gateway',
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
   * Handles the 'tools/list' method
   */
  private static async handleToolsList(req: Request, res: Response, id: any): Promise<any> {
    try {
      const agent = await McpController.getAuthenticatedAgent(req);
      
      const allTools = [
        {
          name: 'sentra.checkAction',
          description: 'Evaluate an AI action through Sentra governance',
          inputSchema: {
            type: 'object',
            properties: {
              action: { type: 'string' },
              metadata: { type: 'object' },
            },
            required: ['action'],
          },
        },
      ];

      // Filter based on agent allowed_tools / blocked_tools (ACL checks)
      const allowed = agent.allowedTools;
      const blocked = agent.blockedTools;

      const filteredTools = allTools.filter((tool) => {
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

      // 3. Evaluate action through decision engine
      // We pass toolName as action and args as metadata
      const decision = await makeDecision(
        agent.agentKeyId, // Using agentKeyId as the agent identifier
        toolName,
        agent.organizationId,
        args
      );

      const durationMs = Math.round(getNow() - startTime);

      // 4. Log evaluation to mcp_audit_logs
      try {
        const inputSummary = JSON.stringify(args);
        await prisma.mcp_audit_logs.create({
          data: {
            organizationId: agent.organizationId,
            agentKeyId: agent.agentKeyId,
            tool_name: toolName,
            input_summary: inputSummary.length > 1000 ? inputSummary.substring(0, 1000) + '...' : inputSummary,
            decision: decision.status,
            risk_level: decision.risk,
            reason: decision.reason,
            duration_ms: durationMs,
          },
        });
      } catch (logErr) {
        logger.error('[MCP-RPC] Failed to write to mcp_audit_logs:', logErr);
      }

      // 5. Handle block vs allow response formats
      if (decision.status === 'blocked') {
        logger.warn(`[MCP-RPC] Decision Blocked: tool="${toolName}" reason="${decision.reason}" latency=${durationMs}ms`);
        return McpController.sendJsonRpcError(
          res,
          -32002,
          'Action blocked by Sentra governance',
          id,
          { reason: decision.reason }
        );
      }

      logger.info(`[MCP-RPC] Decision Allowed: tool="${toolName}" latency=${durationMs}ms`);
      return res.status(200).json({
        jsonrpc: '2.0',
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 'allowed',
                reason: decision.reason,
              }),
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
              input_summary: JSON.stringify(args),
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
        'Action blocked by Sentra governance',
        id,
        { reason: 'Internal governance system error (fail-closed)' }
      );
    }
  }
}

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';
import { McpAgentKeyService } from '../services/mcpAgentKey.service';
import prisma from '../config/db';
import logger from '../utils/logger';

const router = Router();

/**
 * POST /api/v1/mcp/agent-keys
 * Creates a new agent key (authenticate + ADMIN only)
 */
router.post(
  '/agent-keys',
  authenticate,
  authorizeRoles('ADMIN'),
  async (req: any, res: Response, next: NextFunction): Promise<any> => {
    try {
      const { name, allowedTools, blockedTools } = req.body;
      const organizationId = req.user.organizationId;

      if (!name || typeof name !== 'string') {
        return res.status(400).json({ success: false, message: 'Name is required and must be a string' });
      }

      const allowed = Array.isArray(allowedTools) ? allowedTools : [];
      const blocked = Array.isArray(blockedTools) ? blockedTools : [];

      const result = await McpAgentKeyService.createAgentKey(
        organizationId,
        name,
        allowed,
        blocked
      );

      return res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/mcp/agent-keys
 * Lists all agent keys (authenticate)
 */
router.get(
  '/agent-keys',
  authenticate,
  async (req: any, res: Response, next: NextFunction): Promise<any> => {
    try {
      const organizationId = req.user.organizationId;
      const keys = await McpAgentKeyService.listAgentKeys(organizationId);

      return res.status(200).json({
        success: true,
        data: keys,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/mcp/agent-keys/:id
 * Revokes an agent key (authenticate + ADMIN only)
 */
router.delete(
  '/agent-keys/:id',
  authenticate,
  authorizeRoles('ADMIN'),
  async (req: any, res: Response, next: NextFunction): Promise<any> => {
    try {
      const { id } = req.params;
      const organizationId = req.user.organizationId;

      await McpAgentKeyService.revokeAgentKey(id, organizationId);

      return res.status(200).json({
        success: true,
        message: 'Agent key revoked successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/mcp/audit-logs
 * Lists paginated MCP audit logs for the organization (authenticate)
 */
router.get(
  '/audit-logs',
  authenticate,
  async (req: any, res: Response, next: NextFunction): Promise<any> => {
    try {
      const organizationId = req.user.organizationId;
      
      const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
      const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string || '20', 10)));
      const decision = req.query.decision as string;

      const where: any = {
        organizationId,
      };

      if (decision) {
        where.decision = decision;
      }

      const [logs, total] = await Promise.all([
        prisma.mcp_audit_logs.findMany({
          where,
          orderBy: { created_at: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.mcp_audit_logs.count({ where }),
      ]);

      return res.status(200).json({
        success: true,
        data: {
          logs,
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

import { Response } from 'express';
import { asyncHandler, sendError } from '../utils/controllerHelpers';
import { resolveOrganizationId } from '../utils/company';
import { AgentPostureService } from '../services/agentPosture.service';
import logger from '../utils/logger';

export class AgentPostureController {
  /**
   * POST /api/v1/agents/:id/posture-scan
   * Runs posture evaluation on a single agent.
   */
  static readonly scanAgentPosture = asyncHandler(async (req: any, res: Response) => {
    const organizationId = await resolveOrganizationId(req);
    if (!organizationId) return sendError(res, 401, 'Unauthorized');

    const { id } = req.params;
    if (!id) {
      return sendError(res, 400, 'Agent ID is required');
    }

    try {
      const result = await AgentPostureService.scanAgent(organizationId, id);
      return res.status(200).json({
        success: true,
        message: `Posture scan completed for agent ${result.agentName}`,
        data: result,
      });
    } catch (err: any) {
      logger.error(`[POSTURE-CONTROLLER] Error scanning agent ${id}:`, err);
      if (err.message?.includes('not found')) {
        return sendError(res, 404, err.message);
      }
      return sendError(res, 500, err.message || 'Failed to perform posture scan');
    }
  });

  /**
   * POST /api/v1/agents/posture-scan-all
   * Runs posture evaluation on all discovered agents in batch for the tenant.
   */
  static readonly scanAllAgentsPosture = asyncHandler(async (req: any, res: Response) => {
    const organizationId = await resolveOrganizationId(req);
    if (!organizationId) return sendError(res, 401, 'Unauthorized');

    try {
      const result = await AgentPostureService.scanAllAgents(organizationId);
      return res.status(200).json({
        success: true,
        message: `Posture scan completed for all ${result.totalAgentsScanned} agents`,
        data: result,
      });
    } catch (err: any) {
      logger.error(`[POSTURE-CONTROLLER] Error batch scanning agents:`, err);
      return sendError(res, 500, err.message || 'Failed to batch scan agent posture');
    }
  });

  /**
   * GET /api/v1/agents/:id/posture-findings
   * Retrieves stored posture findings for a single agent.
   */
  static readonly getAgentPostureFindings = asyncHandler(async (req: any, res: Response) => {
    const organizationId = await resolveOrganizationId(req);
    if (!organizationId) return sendError(res, 401, 'Unauthorized');

    const { id } = req.params;
    if (!id) {
      return sendError(res, 400, 'Agent ID is required');
    }

    try {
      const result = await AgentPostureService.getAgentFindings(organizationId, id);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      logger.error(`[POSTURE-CONTROLLER] Error fetching posture findings for agent ${id}:`, err);
      if (err.message?.includes('not found')) {
        return sendError(res, 404, err.message);
      }
      return sendError(res, 500, err.message || 'Failed to retrieve posture findings');
    }
  });
}

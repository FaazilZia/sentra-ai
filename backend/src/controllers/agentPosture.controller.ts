import { Request, Response } from 'express';
import { AgentPostureService } from '../services/agentPosture.service';
import logger from '../utils/logger';

export class AgentPostureController {
  /**
   * POST /api/v1/agents/:id/posture-scan
   * Runs posture evaluation on a single agent.
   */
  static async scanAgentPosture(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = (req as any).user?.organizationId || (req as any).organizationId || '00000000-0000-0000-0000-000000000001';
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ error: 'Agent ID is required' });
        return;
      }

      const result = await AgentPostureService.scanAgent(organizationId, id);

      res.status(200).json({
        success: true,
        message: `Posture scan completed for agent ${result.agentName}`,
        data: result,
      });
    } catch (err: any) {
      logger.error(`[POSTURE-CONTROLLER] Error scanning agent ${req.params.id}:`, err);
      res.status(err.message?.includes('not found') ? 404 : 500).json({
        error: err.message || 'Failed to perform posture scan',
      });
    }
  }

  /**
   * POST /api/v1/agents/posture-scan-all
   * Runs posture evaluation on all discovered agents in batch for the tenant.
   */
  static async scanAllAgentsPosture(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = (req as any).user?.organizationId || (req as any).organizationId || '00000000-0000-0000-0000-000000000001';

      const result = await AgentPostureService.scanAllAgents(organizationId);

      res.status(200).json({
        success: true,
        message: `Posture scan completed for all ${result.totalAgentsScanned} agents`,
        data: result,
      });
    } catch (err: any) {
      logger.error(`[POSTURE-CONTROLLER] Error batch scanning agents:`, err);
      res.status(500).json({
        error: err.message || 'Failed to batch scan agent posture',
      });
    }
  }

  /**
   * GET /api/v1/agents/:id/posture-findings
   * Retrieves stored posture findings for a single agent.
   */
  static async getAgentPostureFindings(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = (req as any).user?.organizationId || (req as any).organizationId || '00000000-0000-0000-0000-000000000001';
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ error: 'Agent ID is required' });
        return;
      }

      const result = await AgentPostureService.getAgentFindings(organizationId, id);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      logger.error(`[POSTURE-CONTROLLER] Error fetching posture findings for agent ${req.params.id}:`, err);
      res.status(err.message?.includes('not found') ? 404 : 500).json({
        error: err.message || 'Failed to retrieve posture findings',
      });
    }
  }
}

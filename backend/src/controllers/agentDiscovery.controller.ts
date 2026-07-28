import { Response } from 'express';
import prisma from '../config/db';
import { asyncHandler, sendError } from '../utils/controllerHelpers';
import { resolveOrganizationId } from '../utils/company';
import { AgentDiscoveryService } from '../services/agentDiscovery.service';

export const scanAgents = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');

  const agents = await AgentDiscoveryService.discoverAgents(organizationId);

  return res.status(200).json({
    status: 'scan_completed',
    agentsFound: agents.length,
    agents,
  });
});

export const getAgents = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');

  const agents = await prisma.agent.findMany({
    where: { organizationId },
    orderBy: { discoveredAt: 'desc' },
  });
  return res.status(200).json(agents);
});

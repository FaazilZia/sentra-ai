import { Response } from 'express';
import prisma from '../config/db';
import { asyncHandler, sendError } from '../utils/controllerHelpers';
import { resolveOrganizationId } from '../utils/company';

export const scanAgents = asyncHandler(async (req: any, res: Response) => {
  const { scope } = req.body;

  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');

  const existingCount = await prisma.agent.count({
    where: { organizationId }
  });
  let agentsFound = 0;

  if (existingCount === 0) {
    const seeded = await prisma.agent.createMany({
      data: [
        { name: 'Customer Support Bot', type: 'LLM_AGENT', status: 'active', organizationId },
        { name: 'Financial Analyst Agent', type: 'CALCULATOR_AGENT', status: 'active', organizationId },
        { name: 'Security Auditing Agent', type: 'GRC_AGENT', status: 'inactive', organizationId }
      ]
    });
    agentsFound = seeded.count;
  } else {
    agentsFound = existingCount;
  }

  return res.status(202).json({
    status: 'scan_initiated',
    agentsFound
  });
});

export const getAgents = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');

  const agents = await prisma.agent.findMany({
    where: { organizationId }
  });
  return res.status(200).json(agents);
});

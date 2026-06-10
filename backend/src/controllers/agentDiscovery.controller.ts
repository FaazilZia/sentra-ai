import { Response } from 'express';
import prisma from '../config/db';
import { asyncHandler } from '../utils/controllerHelpers';

export const scanAgents = asyncHandler(async (req: any, res: Response) => {
  const { scope } = req.body;

  const existingCount = await prisma.agent.count();
  let agentsFound = 0;

  if (existingCount === 0) {
    const seeded = await prisma.agent.createMany({
      data: [
        { name: 'Customer Support Bot', type: 'LLM_AGENT', status: 'active' },
        { name: 'Financial Analyst Agent', type: 'CALCULATOR_AGENT', status: 'active' },
        { name: 'Security Auditing Agent', type: 'GRC_AGENT', status: 'inactive' }
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
  const agents = await prisma.agent.findMany();
  return res.status(200).json(agents);
});

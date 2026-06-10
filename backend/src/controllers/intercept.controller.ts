import { Response } from 'express';
import prisma from '../config/db';
import { asyncHandler } from '../utils/controllerHelpers';

export const simulateIntercept = asyncHandler(async (req: any, res: Response) => {
  const { agentId, action, resource } = req.body;

  const event = await prisma.blockEvent.create({
    data: {
      agentId: agentId || '',
      action: action || '',
      resource: resource || '',
      status: 'BLOCKED',
    },
  });

  return res.status(201).json(event);
});

export const getLogs = asyncHandler(async (req: any, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = parseInt(req.query.offset as string) || 0;

  const total = await prisma.blockEvent.count();
  const events = await prisma.blockEvent.findMany({
    take: limit,
    skip: offset,
    orderBy: {
      timestamp: 'desc',
    },
  });

  return res.status(200).json({
    data: events,
    total,
  });
});

import { Response } from 'express';
import prisma from '../config/db';
import { asyncHandler, sendError } from '../utils/controllerHelpers';

export const createGuardrail = asyncHandler(async (req: any, res: Response) => {
  const { name, description, type, enabled } = req.body;

  if (!name || !type) {
    return sendError(res, 400, 'Name and type are required');
  }

  const guardrail = await prisma.guardrail.create({
    data: {
      name,
      description: description || '',
      type,
      enabled: enabled !== undefined ? enabled : true,
    },
  });

  return res.status(201).json(guardrail);
});

export const getGuardrails = asyncHandler(async (req: any, res: Response) => {
  const guardrails = await prisma.guardrail.findMany();
  return res.status(200).json(guardrails);
});

export const getGuardrailById = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const guardrail = await prisma.guardrail.findUnique({
    where: { id },
  });

  if (!guardrail) {
    return res.status(404).json({ error: 'Guardrail not found' });
  }

  return res.status(200).json(guardrail);
});

export const updateGuardrail = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const { name, description, type, enabled } = req.body;

  const existing = await prisma.guardrail.findUnique({
    where: { id },
  });

  if (!existing) {
    return res.status(404).json({ error: 'Guardrail not found' });
  }

  const updated = await prisma.guardrail.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(type !== undefined && { type }),
      ...(enabled !== undefined && { enabled }),
    },
  });

  return res.status(200).json(updated);
});

export const deleteGuardrail = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;

  const existing = await prisma.guardrail.findUnique({
    where: { id },
  });

  if (!existing) {
    return res.status(404).json({ error: 'Guardrail not found' });
  }

  await prisma.guardrail.delete({
    where: { id },
  });

  return res.status(204).send();
});

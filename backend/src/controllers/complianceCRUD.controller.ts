import { Response } from 'express';
import prisma from '../config/db';
import { asyncHandler, sendError } from '../utils/controllerHelpers';

const ALLOWED_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLIANT', 'NON_COMPLIANT'];

export const getGdprControls = asyncHandler(async (req: any, res: Response) => {
  const controls = await prisma.complianceControl.findMany({
    where: { framework: 'gdpr' }
  });
  return res.status(200).json(controls);
});

export const getGdprControlById = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const control = await prisma.complianceControl.findFirst({
    where: { id, framework: 'gdpr' }
  });

  if (!control) {
    return res.status(404).json({ error: 'Control not found' });
  }

  return res.status(200).json(control);
});

export const updateGdprControl = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  const existing = await prisma.complianceControl.findFirst({
    where: { id, framework: 'gdpr' }
  });

  if (!existing) {
    return res.status(404).json({ error: 'Control not found' });
  }

  const updated = await prisma.complianceControl.update({
    where: { id },
    data: { status }
  });

  return res.status(200).json(updated);
});

export const getReadiness = asyncHandler(async (req: any, res: Response) => {
  const allControls = await prisma.complianceControl.findMany();
  
  // Group by framework
  const frameworks: { [key: string]: { total: number; compliant: number } } = {};
  
  allControls.forEach(c => {
    const fw = c.framework.toLowerCase();
    if (!frameworks[fw]) {
      frameworks[fw] = { total: 0, compliant: 0 };
    }
    frameworks[fw].total += 1;
    if (c.status === 'COMPLIANT') {
      frameworks[fw].compliant += 1;
    }
  });

  const response: { [key: string]: { total: number; compliant: number; score: number } } = {};
  
  Object.keys(frameworks).forEach(fw => {
    const { total, compliant } = frameworks[fw];
    const score = total > 0 ? Math.round((compliant / total) * 100) : 0;
    response[fw] = { total, compliant, score };
  });

  return res.status(200).json(response);
});

import { Response } from 'express';
import prisma from '../config/db';
import { asyncHandler, sendError } from '../utils/controllerHelpers';
import { resolveOrganizationId } from '../utils/company';

const ALLOWED_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLIANT', 'NON_COMPLIANT'];

export const getGdprControls = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');

  let controls = await prisma.complianceControl.findMany({
    where: { framework: 'gdpr', organizationId }
  });

  if (controls.length === 0) {
    await prisma.complianceControl.createMany({
      data: [
        { framework: 'gdpr', name: 'Data Minimisation', description: 'Ensure personal data collected is adequate, relevant and limited to what is necessary.', status: 'NOT_STARTED', organizationId },
        { framework: 'gdpr', name: 'Right to Erasure', description: 'Provide mechanisms for users to request erasure of personal data without undue delay.', status: 'NOT_STARTED', organizationId },
        { framework: 'gdpr', name: 'Consent Management', description: 'Obtain freely given, specific, informed and unambiguous consent from data subjects.', status: 'NOT_STARTED', organizationId },
        { framework: 'gdpr', name: 'Data Breach Notification', description: 'Notify the supervisory authority and affected individuals of personal data breaches.', status: 'NOT_STARTED', organizationId },
        { framework: 'gdpr', name: 'Privacy by Design', description: 'Implement appropriate technical and organizational measures to integrate data protection.', status: 'NOT_STARTED', organizationId }
      ]
    });
    controls = await prisma.complianceControl.findMany({
      where: { framework: 'gdpr', organizationId }
    });
  }

  return res.status(200).json(controls);
});

export const getGdprControlById = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');

  const control = await prisma.complianceControl.findFirst({
    where: { id, framework: 'gdpr', organizationId }
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

  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');

  const existing = await prisma.complianceControl.findFirst({
    where: { id, framework: 'gdpr', organizationId }
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
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');

  let allControls = await prisma.complianceControl.findMany({
    where: { organizationId }
  });

  if (allControls.length === 0) {
    await prisma.complianceControl.createMany({
      data: [
        { framework: 'gdpr', name: 'Data Minimisation', description: 'Ensure personal data collected is adequate, relevant and limited to what is necessary.', status: 'NOT_STARTED', organizationId },
        { framework: 'gdpr', name: 'Right to Erasure', description: 'Provide mechanisms for users to request erasure of personal data without undue delay.', status: 'NOT_STARTED', organizationId },
        { framework: 'gdpr', name: 'Consent Management', description: 'Obtain freely given, specific, informed and unambiguous consent from data subjects.', status: 'NOT_STARTED', organizationId },
        { framework: 'gdpr', name: 'Data Breach Notification', description: 'Notify the supervisory authority and affected individuals of personal data breaches.', status: 'NOT_STARTED', organizationId },
        { framework: 'gdpr', name: 'Privacy by Design', description: 'Implement appropriate technical and organizational measures to integrate data protection.', status: 'NOT_STARTED', organizationId }
      ]
    });
    allControls = await prisma.complianceControl.findMany({
      where: { organizationId }
    });
  }
  
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

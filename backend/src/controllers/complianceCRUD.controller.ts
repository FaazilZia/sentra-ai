import { Response } from 'express';
import prisma from '../config/db';
import { asyncHandler, sendError } from '../utils/controllerHelpers';
import { resolveOrganizationId } from '../utils/company';

// Import all 13 framework service classes
import { GdprService } from '../services/gdpr.service';
import { CcpaService } from '../services/ccpa.service';
import { HipaaService } from '../services/hipaa.service';
import { DpdpService } from '../services/dpdp.service';
import { EuAiActService } from '../services/euAiAct.service';
import { NistAiRmfService } from '../services/nistAiRmf.service';
import { Iso42001Service } from '../services/iso42001.service';
import { Iso27001Service } from '../services/iso27001.service';
import { Soc2Service } from '../services/soc2.service';
import { PciService } from '../services/pci.service';
import { DoraService } from '../services/dora.service';
import { OecdService } from '../services/oecd.service';
import { FtcService } from '../services/ftc.service';

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

  // Parallel fetch for all framework stats
  const [
    gdprStats,
    ccpaOverview,
    hipaaStats,
    dpdpStats,
    euAiActOverview,
    nistAiRmfOverview,
    iso42001Overview,
    iso27001Overview,
    soc2Stats,
    pciStats,
    doraOverview,
    oecdOverview,
    ftcOverview
  ] = await Promise.all([
    GdprService.getStats(organizationId).catch(() => null),
    CcpaService.getFrameworkOverview(organizationId).catch(() => null),
    HipaaService.getStats(organizationId).catch(() => null),
    DpdpService.getStats(organizationId).catch(() => null),
    EuAiActService.getFrameworkOverview(organizationId).catch(() => null),
    NistAiRmfService.getFrameworkOverview(organizationId).catch(() => null),
    Iso42001Service.getFrameworkOverview(organizationId).catch(() => null),
    Iso27001Service.getFrameworkOverview(organizationId).catch(() => null),
    Soc2Service.getStats(organizationId).catch(() => null),
    PciService.getStats(organizationId).catch(() => null),
    DoraService.getFrameworkOverview(organizationId).catch(() => null),
    OecdService.getFrameworkOverview(organizationId).catch(() => null),
    FtcService.getFrameworkOverview(organizationId).catch(() => null),
  ]);

  const scores: Record<string, number> = {
    'GDPR': gdprStats?.compliance_score ?? 100,
    'CCPA': ccpaOverview?.summary?.compliance_score ?? 0,
    'HIPAA': hipaaStats?.compliance_score ?? 100,
    'DPDP': dpdpStats?.compliance_score ?? 100,
    'EU AI Act': euAiActOverview?.summary?.compliance_score ?? 0,
    'NIST AI RMF': nistAiRmfOverview?.score ?? 0,
    'ISO 42001': iso42001Overview?.summary?.compliance_score ?? 0,
    'ISO 27001': iso27001Overview?.summary?.compliance_score ?? 0,
    'SOC2': soc2Stats?.compliance_score ?? 100,
    'PCI-DSS': pciStats?.compliance_score ?? 100,
    'DORA': doraOverview?.summary?.compliance_score ?? 0,
    'OECD': oecdOverview?.summary?.compliance_score ?? 0,
    'FTC': ftcOverview?.summary?.compliance_score ?? 0
  };

  const getReadinessStatus = (score: number): 'ready' | 'partial' | 'not_ready' => {
    if (score >= 90) return 'ready';
    if (score >= 30) return 'partial';
    return 'not_ready';
  };

  const readiness: Record<string, { score: number; status: 'ready' | 'partial' | 'not_ready' }> = {};
  Object.keys(scores).forEach(fw => {
    const score = scores[fw];
    readiness[fw] = {
      score,
      status: getReadinessStatus(score)
    };
  });

  const statuses = Object.values(readiness).map(r => r.status);
  const overallReadiness = statuses.every(s => s === 'ready')
    ? 'ready'
    : (statuses.every(s => s === 'not_ready') ? 'not_ready' : 'partial');

  return res.status(200).json({
    readiness,
    overall_readiness: overallReadiness
  });
});

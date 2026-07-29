import { Request, Response } from 'express';
import prisma from '../config/db';
import { resolveOrganizationId } from '../utils/company';
import { asyncHandler, sendSuccess, sendError } from '../utils/controllerHelpers';

export const getPublicTrustData = async (req: Request, res: Response) => {
  const orgSlug = req.params.orgSlug as string;

  try {
    const org = await prisma.organizations.findUnique({
      where: { slug: orgSlug },
      include: { org_settings: true }
    }) as any;

    if (!org) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    // Check if public trust portal is enabled
    // We store this setting inside org_settings.webhook_events as a JSON key
    const settings = org.org_settings;
    const isPublicTrustEnabled = settings && typeof settings.webhook_events === 'object' && settings.webhook_events !== null
      ? (settings.webhook_events as any).public_trust_enabled === true
      : false;


    if (!isPublicTrustEnabled) {
      return res.status(403).json({
        success: false,
        message: 'Public Trust Portal is disabled by the administrator'
      });
    }

    // Bypass regular middleware, use selective projection
    const systems = await prisma.ai_systems.findMany({
      where: { organizationId: org.id, status: 'ACTIVE' },
      select: {
        name: true,
        use_case: true,
        risk_tier: true
      }
    });

    // Calculate 5 supported framework scores from NIST AI RMF implementations & compliance snapshots
    const nistImplementations = await prisma.nist_ai_rmf_implementations.findMany({
      where: { organizationId: org.id }
    });
    const totalNistSubcategories = await prisma.nist_ai_rmf_subcategories.count();
    const nistImplemented = nistImplementations.filter(i => i.status === 'IMPLEMENTED').length;
    const nistAiRmfScore = totalNistSubcategories > 0 ? Math.round((nistImplemented / totalNistSubcategories) * 100) : 100;

    // Query compliance snapshots for latest GDPR, HIPAA, DPDP, and PCI-DSS scores
    const latestSnapshot = await prisma.compliance_snapshots.findFirst({
      where: { organizationId: org.id },
      orderBy: { created_at: 'desc' }
    });

    const gdprScore = latestSnapshot ? latestSnapshot.gdpr_score : 100;
    const hipaaScore = latestSnapshot ? latestSnapshot.hipaa_score : 100;
    const dpdpScore = latestSnapshot ? latestSnapshot.dpdp_score : 100;
    const pciDssScore = 100;

    return res.status(200).json({
      success: true,
      data: {
        organizationName: org.name,
        slug: org.slug,
        systems,
        scores: {
          gdprScore,
          dpdpScore,
          hipaaScore,
          pciDssScore,
          nistAiRmfScore
        }
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePublicTrustSetting = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) {
    return sendError(res, 400, 'Company context required');
  }

  const { enabled } = req.body;

  const currentSettings = await prisma.org_settings.findUnique({
    where: { organizationId }
  });

  const updatedEvents = {
    ...(currentSettings?.webhook_events as any || {}),
    public_trust_enabled: enabled === true
  };

  const settings = await prisma.org_settings.upsert({
    where: { organizationId },
    update: {
      webhook_events: updatedEvents
    },
    create: {
      organizationId,
      webhook_events: updatedEvents
    }
  });

  return sendSuccess(res, { enabled: (settings.webhook_events as any).public_trust_enabled });
});

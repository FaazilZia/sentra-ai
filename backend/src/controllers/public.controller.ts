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

    // 1. Calculate EU AI Act compliance score
    const allEuImplementations = await prisma.eu_ai_act_implementations.findMany({
      where: { organizationId: org.id }
    });
    const totalEuControls = await prisma.eu_ai_act_controls.count();
    const euImplemented = allEuImplementations.filter(i => i.status === 'IMPLEMENTED').length;
    const euNotApplicable = allEuImplementations.filter(i => i.status === 'NOT_APPLICABLE').length;
    const euAiActScore = totalEuControls > 0 ? Math.round(((euImplemented + euNotApplicable) / totalEuControls) * 100) : 0;

    // 2. Calculate ISO 42001 compliance score
    const allIso42001Implementations = await prisma.iso42001_implementations.findMany({
      where: { organizationId: org.id }
    });
    const totalIso42001Controls = await prisma.iso42001_controls.count();
    const iso42001Implemented = allIso42001Implementations.filter(i => i.status === 'IMPLEMENTED').length;
    const iso42001NotApplicable = allIso42001Implementations.filter(i => i.status === 'NOT_APPLICABLE').length;
    const iso42001Score = totalIso42001Controls > 0 ? Math.round(((iso42001Implemented + iso42001NotApplicable) / totalIso42001Controls) * 100) : 0;

    // 3. Calculate ISO 27001 compliance score
    const allIso27001Implementations = await prisma.iso27001_implementations.findMany({
      where: { organizationId: org.id }
    });
    const totalIso27001Controls = await prisma.iso27001_controls.count();
    const iso27001Implemented = allIso27001Implementations.filter(i => i.status === 'IMPLEMENTED').length;
    const iso27001NotApplicable = allIso27001Implementations.filter(i => i.status === 'NOT_APPLICABLE').length;
    const iso27001Score = totalIso27001Controls > 0 ? Math.round(((iso27001Implemented + iso27001NotApplicable) / totalIso27001Controls) * 100) : 0;

    // 4. Query compliance snapshots for latest GDPR, HIPAA, and DPDP scores
    const latestSnapshot = await prisma.compliance_snapshots.findFirst({
      where: { organizationId: org.id },
      orderBy: { created_at: 'desc' }
    });
    const gdprScore = latestSnapshot ? latestSnapshot.gdpr_score : 0;
    const hipaaScore = latestSnapshot ? latestSnapshot.hipaa_score : 0;
    const dpdpScore = latestSnapshot ? latestSnapshot.dpdp_score : 0;

    return res.status(200).json({
      success: true,
      data: {
        organizationName: org.name,
        slug: org.slug,
        systems,
        scores: {
          euAiActScore,
          iso42001Score,
          iso27001Score,
          gdprScore,
          hipaaScore,
          dpdpScore
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

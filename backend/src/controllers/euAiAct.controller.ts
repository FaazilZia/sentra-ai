import { Response } from 'express';
import { EuAiActService } from '../services/euAiAct.service';
import { ComplianceService } from '../services/compliance.service';
import { resolveOrganizationId } from '../utils/company';
import { asyncHandler, sendSuccess, sendError } from '../utils/controllerHelpers';

export const getEuAiActOverview = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');

  const overview = await EuAiActService.getFrameworkOverview(organizationId);
  return sendSuccess(res, overview);
});

export const getEuAiActArticle = asyncHandler(async (req: any, res: Response) => {
  const { articleNumber } = req.params;
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');

  const article = await EuAiActService.getArticle(organizationId, articleNumber);
  if (!article) return sendError(res, 404, `Article not found: ${articleNumber}`);
  return sendSuccess(res, article);
});

export const getEuAiActControls = asyncHandler(async (req: any, res: Response) => {
  const { riskTier } = req.query;
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');

  if (riskTier) {
    const controls = await EuAiActService.getControlsByRiskTier(organizationId, riskTier as string);
    return sendSuccess(res, controls);
  }

  const overview = await EuAiActService.getFrameworkOverview(organizationId);
  const controls = overview.articles.flatMap(art => art.controls);
  return sendSuccess(res, controls);
});

export const updateEuAiActImplementation = asyncHandler(async (req: any, res: Response) => {
  const { controlCode } = req.params;
  const { status, notes, owner_user_id, due_date } = req.body;
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');

  const impl = await EuAiActService.updateImplementation(organizationId, controlCode, {
    status,
    notes,
    owner_user_id,
    due_date: due_date ? new Date(due_date) : undefined
  });

  // Log audit
  await ComplianceService.logAudit(
    req.user.id,
    organizationId,
    'UPDATE_EU_AI_ACT_CONTROL',
    undefined,
    { controlCode, status }
  );

  return sendSuccess(res, impl);
});

export const addEuAiActEvidence = asyncHandler(async (req: any, res: Response) => {
  const { controlCode } = req.params;
  const { type, url, description } = req.body;
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');

  // Find the control implementation
  const overview = await EuAiActService.getFrameworkOverview(organizationId);
  
  // Find the control
  let targetCtrl: any = null;
  for (const art of overview.articles) {
    const found = art.controls.find(c => c.control_code === controlCode);
    if (found) {
      targetCtrl = found;
      break;
    }
  }

  if (!targetCtrl) {
    return sendError(res, 404, `Control not found: ${controlCode}`);
  }

  const existingEvidence = targetCtrl.implementation?.evidence_links || [];
  const newEvidence = {
    type: type || 'link',
    url: url || '',
    description: description || '',
    uploaded_at: new Date()
  };

  const updatedEvidence = [...existingEvidence, newEvidence];

  // Update implementation
  const impl = await EuAiActService.updateImplementation(organizationId, controlCode, {
    status: targetCtrl.implementation?.status || 'IN_PROGRESS',
    evidence_links: updatedEvidence
  });

  // Log audit
  await ComplianceService.logAudit(
    req.user.id,
    organizationId,
    'ADD_EU_AI_ACT_EVIDENCE',
    undefined,
    { controlCode, evidenceType: type }
  );

  return sendSuccess(res, impl, 201);
});

import { Response } from 'express';
import { GovernanceService } from '../services/governance.service';
import { resolveOrganizationId } from '../utils/company';
import { asyncHandler, sendSuccess, sendError } from '../utils/controllerHelpers';

// ==========================================
// RISK ASSESSMENTS
// ==========================================
export const listRiskAssessments = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 400, 'Company context required');

  const items = await GovernanceService.listRiskAssessments(organizationId);
  return sendSuccess(res, { items });
});

export const getRiskAssessment = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 400, 'Company context required');

  const { id } = req.params;
  const item = await GovernanceService.getRiskAssessment(id, organizationId);
  if (!item) return sendError(res, 404, 'Risk assessment not found');

  return sendSuccess(res, item);
});

export const createRiskAssessment = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 400, 'Company context required');

  const { ai_system_id } = req.body;
  try {
    const item = await GovernanceService.createRiskAssessment(organizationId, ai_system_id);
    return sendSuccess(res, item, 201);
  } catch (error: any) {
    return sendError(res, 400, error.message);
  }
});

export const submitRiskAssessment = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 400, 'Company context required');

  const { id } = req.params;
  const { answers } = req.body;

  try {
    const item = await GovernanceService.submitRiskAssessment(id, organizationId, answers);
    return sendSuccess(res, item);
  } catch (error: any) {
    return sendError(res, 400, error.message);
  }
});

// ==========================================
// IMPACT ASSESSMENTS (DPIA / AIA)
// ==========================================
export const listImpactAssessments = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 400, 'Company context required');

  const items = await GovernanceService.listImpactAssessments(organizationId);
  return sendSuccess(res, { items });
});

export const createImpactAssessment = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 400, 'Company context required');

  const { ai_system_id, type, form_data, submitted_by } = req.body;
  try {
    const item = await GovernanceService.createImpactAssessment(organizationId, {
      ai_system_id,
      type,
      form_data,
      submitted_by: submitted_by || req.user?.email
    });
    return sendSuccess(res, item, 201);
  } catch (error: any) {
    return sendError(res, 400, error.message);
  }
});

export const updateImpactAssessment = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 400, 'Company context required');

  const { id } = req.params;
  const item = await GovernanceService.updateImpactAssessment(id, organizationId, req.body);
  if (!item) return sendError(res, 404, 'Impact assessment not found');

  return sendSuccess(res, item);
});

export const deleteImpactAssessment = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 400, 'Company context required');

  const { id } = req.params;
  const success = await GovernanceService.deleteImpactAssessment(id, organizationId);
  if (!success) return sendError(res, 404, 'Impact assessment not found or not deleted');

  return sendSuccess(res, { success: true });
});

// ==========================================
// CONTROLS LIBRARY & IMPLEMENTATIONS
// ==========================================
export const listControls = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 400, 'Company context required');

  const items = await GovernanceService.listControls(organizationId);
  return sendSuccess(res, { items });
});

export const createControl = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 400, 'Company context required');

  const item = await GovernanceService.createControl(organizationId, req.body);
  return sendSuccess(res, item, 201);
});

export const updateControlImplementation = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 400, 'Company context required');

  const { controlId } = req.params;
  try {
    const item = await GovernanceService.updateControlImplementation(organizationId, controlId, req.body);
    return sendSuccess(res, item);
  } catch (error: any) {
    return sendError(res, 400, error.message);
  }
});

// ==========================================
// VENDOR AI TOOLS
// ==========================================
export const listVendorAiTools = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 400, 'Company context required');

  const items = await GovernanceService.listVendorAiTools(organizationId);
  return sendSuccess(res, { items });
});

export const createVendorAiTool = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 400, 'Company context required');

  const item = await GovernanceService.createVendorAiTool(organizationId, req.body);
  return sendSuccess(res, item, 201);
});

export const reviewVendorAiTool = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 400, 'Company context required');

  const { id } = req.params;
  const { status } = req.body;
  const reviewerId = req.user?.id;

  try {
    const item = await GovernanceService.reviewVendorAiTool(id, organizationId, reviewerId, status);
    if (!item) return sendError(res, 404, 'Vendor tool review failed or not found');
    return sendSuccess(res, item);
  } catch (error: any) {
    return sendError(res, 400, error.message);
  }
});

// ==========================================
// MODEL CARDS
// ==========================================
export const getModelCard = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 400, 'Company context required');

  const { aiSystemId } = req.params;
  try {
    const item = await GovernanceService.getModelCard(aiSystemId, organizationId);
    if (!item) return sendError(res, 404, 'Model card not found for this system');
    return sendSuccess(res, item);
  } catch (error: any) {
    return sendError(res, 400, error.message);
  }
});

export const updateModelCard = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 400, 'Company context required');

  const { aiSystemId } = req.params;
  try {
    const item = await GovernanceService.updateModelCard(aiSystemId, organizationId, {
      ...req.body,
      last_updated_by: req.user?.email
    });
    return sendSuccess(res, item);
  } catch (error: any) {
    return sendError(res, 400, error.message);
  }
});

// ==========================================
// COMPLIANCE OBLIGATIONS
// ==========================================
export const listObligations = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 400, 'Company context required');

  const items = await GovernanceService.listObligations(organizationId);
  return sendSuccess(res, { items });
});

export const updateObligation = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 400, 'Company context required');

  const { id } = req.params;
  try {
    const item = await GovernanceService.updateObligation(id, organizationId, req.body);
    if (!item) return sendError(res, 404, 'Obligation not found');
    return sendSuccess(res, item);
  } catch (error: any) {
    return sendError(res, 400, error.message);
  }
});

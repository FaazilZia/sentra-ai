import { Request, Response } from 'express';
import { FriaService } from '../services/fria.service';
import { asyncHandler, sendSuccess, sendError, getOrgId } from '../utils/controllerHelpers';

export const createAssessment = asyncHandler(async (req: any, res: Response) => {
  const { aiSystemId } = req.body;
  if (!aiSystemId) {
    return sendError(res, 400, 'aiSystemId is required');
  }
  const organizationId = getOrgId(req);
  const assessment = await FriaService.createAssessment(organizationId, aiSystemId);
  return sendSuccess(res, assessment, 201);
});

export const getAssessment = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const organizationId = getOrgId(req);
  try {
    const assessment = await FriaService.getAssessment(organizationId, id);
    return sendSuccess(res, assessment);
  } catch (err: any) {
    return sendError(res, 404, err.message);
  }
});

export const listAssessments = asyncHandler(async (req: any, res: Response) => {
  const organizationId = getOrgId(req);
  const assessments = await FriaService.listAssessments(organizationId);
  return sendSuccess(res, assessments);
});

export const saveResponses = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const { responses } = req.body;
  if (!Array.isArray(responses)) {
    return sendError(res, 400, 'responses must be an array');
  }
  const organizationId = getOrgId(req);
  try {
    const updated = await FriaService.saveResponses(organizationId, id, responses);
    return sendSuccess(res, updated);
  } catch (err: any) {
    return sendError(res, 404, err.message);
  }
});

export const completeAssessment = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const organizationId = getOrgId(req);
  try {
    const updated = await FriaService.completeAssessment(organizationId, id);
    return sendSuccess(res, updated);
  } catch (err: any) {
    return sendError(res, 404, err.message);
  }
});

export const getComplianceStatus = asyncHandler(async (req: any, res: Response) => {
  const { aiSystemId } = req.params;
  const organizationId = getOrgId(req);
  const status = await FriaService.getComplianceStatus(organizationId, aiSystemId);
  return sendSuccess(res, status);
});

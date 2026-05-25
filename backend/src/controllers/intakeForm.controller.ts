import { Response } from 'express';
import { IntakeFormService } from '../services/intakeForm.service';
import { IntakeLLMService } from '../services/intakeLLM.service';
import { resolveOrganizationId } from '../utils/company';
import { asyncHandler, sendSuccess, sendError } from '../utils/controllerHelpers';
import { IntakeSubmissionStatus } from '@prisma/client';
import prisma from '../config/db';

export const getActiveForm = asyncHandler(async (req: any, res: Response) => {
  const orgId = await resolveOrganizationId(req);
  if (!orgId) return sendError(res, 401, 'Unauthorized');

  const form = await IntakeFormService.getActiveForm(orgId);
  return sendSuccess(res, form);
});

export const createSubmission = asyncHandler(async (req: any, res: Response) => {
  const orgId = await resolveOrganizationId(req);
  if (!orgId) return sendError(res, 401, 'Unauthorized');

  const { agentName, agentDescription, useCase, formData } = req.body;
  if (!agentName || !useCase) {
    return sendError(res, 400, 'Agent name and use case are required fields.');
  }

  const submission = await IntakeFormService.createSubmission(
    orgId,
    req.user.id,
    agentName,
    agentDescription || '',
    useCase,
    formData || {}
  );
  return sendSuccess(res, submission, 201);
});

export const getSubmissions = asyncHandler(async (req: any, res: Response) => {
  const orgId = await resolveOrganizationId(req);
  if (!orgId) return sendError(res, 401, 'Unauthorized');

  const statusQuery = req.query.status as string | undefined;
  let status: IntakeSubmissionStatus | undefined;

  if (statusQuery) {
    const validStatuses = ['pending', 'approved', 'rejected'];
    if (!validStatuses.includes(statusQuery)) {
      return sendError(res, 400, `Invalid status filter: ${statusQuery}`);
    }
    status = statusQuery as IntakeSubmissionStatus;
  }

  const submissions = await IntakeFormService.getSubmissions(orgId, status);
  return sendSuccess(res, submissions);
});

export const approveSubmission = asyncHandler(async (req: any, res: Response) => {
  const orgId = await resolveOrganizationId(req);
  if (!orgId) return sendError(res, 401, 'Unauthorized');
  
  if (req.user.role !== 'ADMIN') {
    return sendError(res, 403, 'Forbidden: Only organization administrators can approve intake submissions.');
  }

  const { id } = req.params;
  const { note } = req.body;

  try {
    const result = await IntakeFormService.approveSubmission(id, req.user.id, note);
    return sendSuccess(res, result);
  } catch (error: any) {
    return sendError(res, 400, error.message || 'Approval failed');
  }
});

export const rejectSubmission = asyncHandler(async (req: any, res: Response) => {
  const orgId = await resolveOrganizationId(req);
  if (!orgId) return sendError(res, 401, 'Unauthorized');

  if (req.user.role !== 'ADMIN') {
    return sendError(res, 403, 'Forbidden: Only organization administrators can reject intake submissions.');
  }

  const { id } = req.params;
  const { note } = req.body;

  if (!note || !note.trim()) {
    return sendError(res, 400, 'A rejection review note explaining the decision is required.');
  }

  try {
    const submission = await IntakeFormService.rejectSubmission(id, req.user.id, note);
    return sendSuccess(res, submission);
  } catch (error: any) {
    return sendError(res, 400, error.message || 'Rejection failed');
  }
});

export const suggestQuestions = asyncHandler(async (req: any, res: Response) => {
  const { description } = req.body;
  if (!description) {
    return sendError(res, 400, 'Agent description is required.');
  }

  const questions = await IntakeLLMService.generateSuggestedQuestions(description);
  return sendSuccess(res, questions);
});

export const getRiskScore = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const submission = await prisma.intake_submissions.findUnique({
    where: { id },
    select: { llm_risk_score: true }
  });

  if (!submission) {
    return sendError(res, 404, 'Submission not found');
  }

  return sendSuccess(res, submission.llm_risk_score);
});

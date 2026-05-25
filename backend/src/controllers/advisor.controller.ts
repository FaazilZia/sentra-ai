import { Response } from 'express';
import { AdvisorService } from '../services/advisor.service';
import { resolveOrganizationId } from '../utils/company';
import { asyncHandler, sendSuccess, sendError } from '../utils/controllerHelpers';

export const chatWithAdvisor = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) {
    return sendError(res, 400, 'Company context required');
  }

  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return sendError(res, 400, 'Invalid message history format');
  }

  // Set headers for Server-Sent Events (SSE)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  await AdvisorService.chat(organizationId, req.user?.id || 'system', messages, res);
});

export const getAdvisorSuggestions = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) {
    return sendError(res, 400, 'Company context required');
  }

  const suggestions = await AdvisorService.getSuggestions(organizationId);
  return sendSuccess(res, suggestions);
});

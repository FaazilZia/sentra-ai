import { Response } from 'express';
import { AISystemService } from '../services/aiSystem.service';
import { resolveOrganizationId } from '../utils/company';
import { asyncHandler, sendSuccess, sendError } from '../utils/controllerHelpers';
import { ChangeHistoryService } from '../services/changeHistory.service';

export const listAISystems = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) {
    return sendError(res, 400, 'Company context required');
  }

  const items = await AISystemService.list(organizationId);
  return sendSuccess(res, { items });
});

export const getAISystem = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) {
    return sendError(res, 400, 'Company context required');
  }

  const { id } = req.params;
  const item = await AISystemService.get(id, organizationId);
  if (!item) {
    return sendError(res, 404, 'AI System not found');
  }

  return sendSuccess(res, item);
});

export const createAISystem = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) {
    return sendError(res, 400, 'Company context required');
  }

  const item = await AISystemService.create(organizationId, req.body);

  await ChangeHistoryService.logChange(
    organizationId,
    'agent',
    item.id,
    req.user.id,
    'created',
    null,
    item,
    'AI System registered'
  );

  return sendSuccess(res, item, 201);
});

export const updateAISystem = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) {
    return sendError(res, 400, 'Company context required');
  }

  const { id } = req.params;
  const existing = await AISystemService.get(id, organizationId);
  const item = await AISystemService.update(id, organizationId, req.body);
  if (!item) {
    return sendError(res, 404, 'AI System not found or not updated');
  }

  await ChangeHistoryService.logChange(
    organizationId,
    'agent',
    id,
    req.user.id,
    'updated',
    existing,
    item,
    'AI System updated'
  );

  return sendSuccess(res, item);
});

export const deleteAISystem = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) {
    return sendError(res, 400, 'Company context required');
  }

  const { id } = req.params;
  const existing = await AISystemService.get(id, organizationId);
  const success = await AISystemService.delete(id, organizationId);
  if (!success) {
    return sendError(res, 404, 'AI System not found or not deleted');
  }

  await ChangeHistoryService.logChange(
    organizationId,
    'agent',
    id,
    req.user.id,
    'deleted',
    existing,
    null,
    'AI System deleted'
  );

  return sendSuccess(res, { success: true });
});

export const syncConnectorAgents = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) {
    return sendError(res, 400, 'Company context required');
  }

  const mockDiscovered = [
    {
      id: "disc-1",
      name: "Customer Support Auto-Responder",
      description: "Unregistered GPT-4o integration scanning client support channels on Slack.",
      source: "Slack Connector",
      risk_level: "HIGH",
      risk_score: 78,
      found_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      status: "DISCOVERED",
      reviewStatus: null
    },
    {
      id: "disc-2",
      name: "Shadow Finance Model",
      description: "Replicate-hosted Llama-3 instance used by finance team to analyze quarterly earnings sheets.",
      source: "AWS VPC Flow Logs",
      risk_level: "CRITICAL",
      risk_score: 92,
      found_at: new Date(Date.now() - 3600000 * 6).toISOString(),
      status: "DISCOVERED",
      reviewStatus: "confirmed"
    },
    {
      id: "disc-3",
      name: "Developer Code Assistant",
      description: "Ollama local server running Codellama accessed across dev subnets without authorization.",
      source: "GitHub Audit Logs",
      risk_level: "MEDIUM",
      risk_score: 45,
      found_at: new Date(Date.now() - 3600000 * 24).toISOString(),
      status: "DISCOVERED",
      reviewStatus: null
    },
    {
      id: "disc-4",
      name: "HR Talent screener",
      description: "Anthropic Claude Claude-3-haiku powered resumes parser script.",
      source: "Google Workspace Sync",
      risk_level: "LOW",
      risk_score: 25,
      found_at: new Date(Date.now() - 3600000 * 48).toISOString(),
      status: "DISCOVERED",
      reviewStatus: "rejected"
    }
  ];

  return sendSuccess(res, mockDiscovered);
});


import { Response } from 'express';
import { EvidenceService, UploadMetadata } from '../services/evidence.service';
import { resolveOrganizationId } from '../utils/company';
import { asyncHandler, sendSuccess, sendError } from '../utils/controllerHelpers';
import { EvidenceType } from '@prisma/client';

export const uploadEvidenceFile = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');

  const userId = req.user?.id;
  if (!userId) return sendError(res, 401, 'Unauthorized');

  const file = req.file;
  if (!file) return sendError(res, 400, 'No file uploaded');

  const { title, description, entityType, entityId, tags } = req.body;
  if (!title || !entityType) {
    return sendError(res, 400, 'Title and Entity Type are required');
  }

  // Validate entityType is one of the enum values
  const validTypes = Object.values(EvidenceType);
  if (!validTypes.includes(entityType as EvidenceType)) {
    return sendError(res, 400, `Invalid Entity Type. Must be one of: ${validTypes.join(', ')}`);
  }

  // Parse tags if provided as comma-separated list
  let parsedTags: string[] = [];
  if (typeof tags === 'string' && tags.trim()) {
    parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
  } else if (Array.isArray(tags)) {
    parsedTags = tags;
  }

  const metadata: UploadMetadata = {
    title,
    description,
    entityType: entityType as EvidenceType,
    entityId: entityId || undefined,
    tags: parsedTags
  };

  const record = await EvidenceService.uploadEvidence(file, metadata, organizationId, userId);
  return sendSuccess(res, record, 201);
});

export const getEvidenceList = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');

  const { entityType, entityId, tags } = req.query;

  let parsedTags: string[] | undefined = undefined;
  if (typeof tags === 'string' && tags.trim()) {
    parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
  }

  const filters = {
    entityType: entityType ? (entityType as EvidenceType) : undefined,
    entityId: entityId ? String(entityId) : undefined,
    tags: parsedTags
  };

  const list = await EvidenceService.getAllEvidence(organizationId, filters);
  return sendSuccess(res, list, 200);
});

export const getEvidenceById = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');

  const { id } = req.params;
  if (!id) return sendError(res, 400, 'Evidence ID is required');

  const record = await EvidenceService.getEvidenceById(id, organizationId);
  if (!record) return sendError(res, 404, 'Evidence not found');

  return sendSuccess(res, record, 200);
});

export const deleteEvidenceRecord = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');

  const { id } = req.params;
  if (!id) return sendError(res, 400, 'Evidence ID is required');

  await EvidenceService.deleteEvidence(id, organizationId);
  return sendSuccess(res, { success: true, message: 'Evidence deleted successfully' }, 200);
});

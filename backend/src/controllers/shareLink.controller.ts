import { Request, Response } from 'express';
import { ShareLinkService } from '../services/shareLink.service';
import { resolveOrganizationId } from '../utils/company';
import { asyncHandler, sendSuccess, sendError } from '../utils/controllerHelpers';

export const createShareLink = asyncHandler(async (req: any, res: Response) => {
  const orgId = await resolveOrganizationId(req);
  if (!orgId) return sendError(res, 401, 'Unauthorized');

  const userId = req.user?.id;
  if (!userId) return sendError(res, 401, 'User session not found');

  const { resourceType, resourceId, expiresInDays } = req.body;
  if (!resourceType) return sendError(res, 400, 'Resource type is required');

  const link = await ShareLinkService.createShareLink(
    orgId,
    userId,
    resourceType,
    resourceId || null,
    expiresInDays ? parseInt(expiresInDays, 10) : undefined
  );

  return sendSuccess(res, link);
});

export const getShareLinks = asyncHandler(async (req: any, res: Response) => {
  const orgId = await resolveOrganizationId(req);
  if (!orgId) return sendError(res, 401, 'Unauthorized');

  const { resourceType, resourceId } = req.params;
  if (!resourceType) return sendError(res, 400, 'Resource type is required');

  const links = await ShareLinkService.getShareLinksByResource(
    resourceType as any,
    resourceId === 'null' ? null : resourceId,
    orgId
  );

  return sendSuccess(res, links);
});

export const revokeShareLink = asyncHandler(async (req: any, res: Response) => {
  const orgId = await resolveOrganizationId(req);
  if (!orgId) return sendError(res, 401, 'Unauthorized');

  const { id } = req.params;
  if (!id) return sendError(res, 400, 'Share link ID is required');

  const success = await ShareLinkService.revokeShareLink(id, orgId);
  if (!success) return sendError(res, 404, 'Share link not found or already inactive');

  return sendSuccess(res, { success: true });
});

export const resolveShareLink = asyncHandler(async (req: Request, res: Response) => {
  const token = req.params.token as string;
  if (!token) return sendError(res, 400, 'Token is required');

  const result = await ShareLinkService.resolveShareLink(token);
  if (!result) {
    return sendError(res, 404, 'Share link not found');
  }

  if ('expired' in result && result.expired) {
    return sendError(res, 410, result.reason || 'This share link has expired');
  }

  return sendSuccess(res, result);
});

import { Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { resolveOrganizationId } from '../utils/company';
import { asyncHandler, sendSuccess, sendError } from '../utils/controllerHelpers';

export const getNotifications = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');

  const userId = req.user?.id;
  if (!userId) return sendError(res, 401, 'Unauthorized');

  const page = Number.parseInt(req.query.page as string || '1', 10);
  const limit = Number.parseInt(req.query.limit as string || '10', 10);

  const result = await NotificationService.getNotificationsForUser(userId, organizationId, page, limit);
  return sendSuccess(res, result, 200);
});

export const getUnreadCount = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');

  const userId = req.user?.id;
  if (!userId) return sendError(res, 401, 'Unauthorized');

  const count = await NotificationService.getUnreadCount(userId, organizationId);
  return sendSuccess(res, { count }, 200);
});

export const markNotificationRead = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return sendError(res, 401, 'Unauthorized');

  const { id } = req.params;
  if (!id) return sendError(res, 400, 'Notification ID is required');

  await NotificationService.markAsRead(id, userId);
  return sendSuccess(res, { success: true }, 200);
});

export const markAllNotificationsRead = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');

  const userId = req.user?.id;
  if (!userId) return sendError(res, 401, 'Unauthorized');

  await NotificationService.markAllAsRead(userId, organizationId);
  return sendSuccess(res, { success: true }, 200);
});

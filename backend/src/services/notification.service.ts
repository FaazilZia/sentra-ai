import prisma from '../config/db';
import logger from '../utils/logger';
import { NotificationType } from '@prisma/client';

export const NotificationService = {
  /**
   * Core notification creation
   */
  async createNotification(
    userId: string,
    orgId: string,
    type: NotificationType,
    title: string,
    message: string,
    entityType?: string,
    entityId?: string
  ) {
    try {
      // Validate that user belongs to the org or is active
      const user = await prisma.users.findFirst({
        where: { id: userId, organizationId: orgId }
      });
      if (!user) {
        logger.warn(`Skipping notification: User ${userId} not found in org ${orgId}`);
        return null;
      }

      const notification = await prisma.notifications.create({
        data: {
          userId,
          orgId,
          type,
          title,
          message,
          entityType: entityType || null,
          entityId: entityId || null,
          isRead: false
        }
      });
      logger.info(`[Notification] Created notification ID ${notification.id} for user ${userId}`);
      return notification;
    } catch (error) {
      logger.error(`Failed to create notification for user ${userId}:`, error);
      return null;
    }
  },

  /**
   * Helper to retrieve all active organization admins
   */
  async getOrgAdmins(orgId: string) {
    return prisma.users.findMany({
      where: {
        organizationId: orgId,
        role: 'ADMIN',
        is_active: true
      }
    });
  },

  /**
   * Scoped Notification Trigger: Guardrail Action Blocked
   * Notify organization admins + the triggering user (if it is a real user ID)
   */
  async notifyGuardrailBlock(
    orgId: string,
    triggeringUserId: string,
    title: string,
    message: string,
    entityType?: string,
    entityId?: string
  ) {
    try {
      const uids = new Set<string>();

      // 1. Notify triggering user if valid uuid
      if (triggeringUserId && triggeringUserId.length === 36 && !triggeringUserId.startsWith('sentra_')) {
        uids.add(triggeringUserId);
      }

      // 2. Notify all admins in the organization
      const admins = await this.getOrgAdmins(orgId);
      admins.forEach(adm => uids.add(adm.id));

      const notifications: any[] = [];
      for (const uid of uids) {
        const notif = await this.createNotification(
          uid,
          orgId,
          NotificationType.alert,
          title,
          message,
          entityType,
          entityId
        );
        if (notif) notifications.push(notif);
      }
      return notifications;
    } catch (error) {
      logger.error('Failed to notify guardrail block:', error);
      return [];
    }
  },

  /**
   * Scoped Notification Trigger: Drift Detected
   * Notify organization admins only
   */
  async notifyDriftDetected(
    orgId: string,
    title: string,
    message: string,
    entityType?: string,
    entityId?: string
  ) {
    try {
      const admins = await this.getOrgAdmins(orgId);
      const notifications: any[] = [];
      for (const adm of admins) {
        const notif = await this.createNotification(
          adm.id,
          orgId,
          NotificationType.drift,
          title,
          message,
          entityType,
          entityId
        );
        if (notif) notifications.push(notif);
      }
      return notifications;
    } catch (error) {
      logger.error('Failed to notify drift detection:', error);
      return [];
    }
  },

  /**
   * Scoped Notification Trigger: Incident Created
   * Notify organization admins only
   */
  async notifyIncidentCreated(
    orgId: string,
    title: string,
    message: string,
    entityType?: string,
    entityId?: string
  ) {
    try {
      const admins = await this.getOrgAdmins(orgId);
      const notifications: any[] = [];
      for (const adm of admins) {
        const notif = await this.createNotification(
          adm.id,
          orgId,
          NotificationType.incident,
          title,
          message,
          entityType,
          entityId
        );
        if (notif) notifications.push(notif);
      }
      return notifications;
    } catch (error) {
      logger.error('Failed to notify incident creation:', error);
      return [];
    }
  },

  /**
   * Scoped Notification Trigger: Workflow Tasks State Transitions
   * Notify assignee and creator only
   */
  async notifyWorkflowTransition(
    orgId: string,
    assigneeId: string | null,
    creatorId: string,
    title: string,
    message: string,
    entityType?: string,
    entityId?: string
  ) {
    try {
      const uids = new Set<string>();
      if (creatorId) uids.add(creatorId);
      if (assigneeId) uids.add(assigneeId);

      const notifications: any[] = [];
      for (const uid of uids) {
        const notif = await this.createNotification(
          uid,
          orgId,
          NotificationType.workflow,
          title,
          message,
          entityType,
          entityId
        );
        if (notif) notifications.push(notif);
      }
      return notifications;
    } catch (error) {
      logger.error('Failed to notify workflow transition:', error);
      return [];
    }
  },

  /**
   * Fetch paginated notifications for a user
   */
  async getNotificationsForUser(userId: string, orgId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [notifications, total] = await Promise.all([
      prisma.notifications.findMany({
        where: { userId, orgId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.notifications.count({
        where: { userId, orgId }
      })
    ]);

    return {
      notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  },

  /**
   * Get unread notifications count for a user
   */
  async getUnreadCount(userId: string, orgId: string) {
    return prisma.notifications.count({
      where: { userId, orgId, isRead: false }
    });
  },

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string, userId: string) {
    return prisma.notifications.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true }
    });
  },

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string, orgId: string) {
    return prisma.notifications.updateMany({
      where: { userId, orgId, isRead: false },
      data: { isRead: true }
    });
  }
};

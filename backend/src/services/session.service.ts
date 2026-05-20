import { randomUUID } from 'crypto';
import prisma from '../config/db';
import logger from '../utils/logger';
import { getRedisClient } from '../config/redis';
import { generateAccessToken } from '../utils/jwt';

const SESSION_REVOKE_PREFIX = 'session:revoked:';
const SESSION_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

export const SessionService = {
  /**
   * Create a new login session record with device tracking.
   */
  async createSession(params: {
    userId: string;
    ipAddress?: string;
    userAgent?: string;
    deviceId?: string;
  }): Promise<string> {
    const sessionToken = randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_TTL * 1000);

    const deviceName = this.parseDeviceName(params.userAgent || '');

    await prisma.login_sessions.create({
      data: {
        id: randomUUID(),
        userId: params.userId,
        session_token: sessionToken,
        device_id: params.deviceId,
        device_name: deviceName,
        ip_address: params.ipAddress,
        user_agent: params.userAgent,
        is_active: true,
        last_active: new Date(),
        expires_at: expiresAt,
      },
    });

    return sessionToken;
  },

  /**
   * Get all active sessions for a user.
   */
  async getActiveSessions(userId: string) {
    return prisma.login_sessions.findMany({
      where: { userId, is_active: true, expires_at: { gt: new Date() } },
      orderBy: { last_active: 'desc' },
      select: {
        id: true,
        device_name: true,
        device_id: true,
        ip_address: true,
        location: true,
        last_active: true,
        created_at: true,
        expires_at: true,
      },
    });
  },

  /**
   * Revoke a specific session (by session ID).
   */
  async revokeSession(sessionId: string, userId: string): Promise<void> {
    const session = await prisma.login_sessions.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) throw new Error('Session not found');

    await prisma.login_sessions.update({
      where: { id: sessionId },
      data: { is_active: false, revoked_at: new Date() },
    });

    // Also revoke any refresh tokens associated with this session
    await prisma.refreshToken.updateMany({
      where: { userId, session_id: sessionId },
      data: { revoked: true },
    });

    // Add to Redis blacklist for immediate effect
    const redis = getRedisClient();
    if (redis) {
      await redis.set(`${SESSION_REVOKE_PREFIX}${session.session_token}`, '1', 'EX', SESSION_TTL).catch(() => {});
    }

    logger.info(`[Session] Revoked session ${sessionId} for user ${userId}`);
  },

  /**
   * Revoke ALL sessions for a user (global sign-out).
   */
  async revokeAllSessions(userId: string): Promise<void> {
    const sessions = await prisma.login_sessions.findMany({
      where: { userId, is_active: true },
      select: { id: true, session_token: true },
    });

    await prisma.login_sessions.updateMany({
      where: { userId, is_active: true },
      data: { is_active: false, revoked_at: new Date() },
    });

    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { revoked: true },
    });

    // Redis blacklist all tokens
    const redis = getRedisClient();
    if (redis) {
      for (const s of sessions) {
        await redis.set(`${SESSION_REVOKE_PREFIX}${s.session_token}`, '1', 'EX', SESSION_TTL).catch(() => {});
      }
    }

    logger.info(`[Session] Revoked all sessions for user ${userId}`);
  },

  /**
   * Check if a session token has been revoked.
   */
  async isSessionRevoked(sessionToken: string): Promise<boolean> {
    const redis = getRedisClient();
    if (redis) {
      const revoked = await redis.get(`${SESSION_REVOKE_PREFIX}${sessionToken}`).catch(() => null);
      if (revoked) return true;
    }
    return false;
  },

  /**
   * Update last active timestamp for a session.
   */
  async touchSession(sessionToken: string): Promise<void> {
    await prisma.login_sessions.updateMany({
      where: { session_token: sessionToken },
      data: { last_active: new Date() },
    });
  },

  /**
   * Parse a simple device name from user agent string.
   */
  parseDeviceName(userAgent: string): string {
    if (!userAgent) return 'Unknown Device';
    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS Device';
    if (userAgent.includes('Android')) return 'Android Device';
    if (userAgent.includes('Windows')) return 'Windows PC';
    if (userAgent.includes('Mac')) return 'Mac';
    if (userAgent.includes('Linux')) return 'Linux';
    return 'Browser';
  },
};

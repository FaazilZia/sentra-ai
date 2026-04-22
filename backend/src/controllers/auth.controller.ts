import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import prisma from '../config/db';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import logger from '../utils/logger';
import { auditLogger } from '../utils/auditLogger';

// Default tenant UUID — used when no tenant is specified
const DEFAULT_ORGANIZATION_ID = '00000000-0000-0000-0000-000000000001';

// Ensure default company exists
async function ensureDefaultCompany() {
  try {
    const existing = await prisma.organizations.findUnique({ where: { id: DEFAULT_ORGANIZATION_ID } });
    if (!existing) {
      await prisma.organizations.create({
        data: {
          id: DEFAULT_ORGANIZATION_ID,
          name: 'Sentra AI',
          slug: 'sentra-ai',
          is_active: true,
        },
      });
      logger.info('Default company created');
    }
  } catch (err) {
    logger.warn('Could not ensure default company:', err);
  }
}

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, fullName, role } = req.body;

    const existingUser = await prisma.users.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    await ensureDefaultCompany();

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.users.create({
      data: {
        id: randomUUID(),
        email,
        password_hash: passwordHash,
        full_name: fullName,
        role: 'USER', // Always default to USER for public registration
        is_active: true,
        organizationId: DEFAULT_ORGANIZATION_ID,
      },
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: { id: user.id, email: user.email, fullName: user.full_name, role: user.role },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.users.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const role = user.role || 'USER';
    const accessToken = generateAccessToken({ id: user.id, role, organizationId: user.organizationId });
    const refreshToken = generateRefreshToken({ id: user.id, organizationId: user.organizationId });

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    await auditLogger.log({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      metadata: { ip: req.ip }
    });

    res.status(200).json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role,
          organizationId: user.organizationId,
          is_active: user.is_active,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(401).json({ success: false, message: 'Refresh token required' });

    // 1. Verify and lookup token
    const decoded = verifyRefreshToken(token);
    if (!decoded) return res.status(403).json({ success: false, message: 'Invalid or expired token' });

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token },
    });

    if (!storedToken || storedToken.revoked) {
      return res.status(403).json({ success: false, message: 'Token revoked or invalid' });
    }

    // 2. Revoke the used token immediately
    await prisma.refreshToken.update({
      where: { token },
      data: { revoked: true }
    });

    // 3. Generate new tokens
    const user = await prisma.users.findUnique({ where: { id: storedToken.userId } });
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });

    const newAccessToken = generateAccessToken({ id: user.id, role: user.role || 'USER', organizationId: user.organizationId });
    const newRefreshToken = generateRefreshToken({ id: user.id, organizationId: user.organizationId });

    // Store the new refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: any, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.users.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role || 'USER',
        organizationId: user.organizationId,
        is_active: user.is_active,
      },
    });
  } catch (error) {
    next(error);
  }
};

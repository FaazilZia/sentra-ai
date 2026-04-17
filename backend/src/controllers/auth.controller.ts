import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import prisma from '../config/db';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import logger from '../utils/logger';

// Default tenant UUID — used when no tenant is specified
const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';

// Ensure default tenant exists
async function ensureDefaultTenant() {
  try {
    const existing = await prisma.tenants.findUnique({ where: { id: DEFAULT_TENANT_ID } });
    if (!existing) {
      await prisma.tenants.create({
        data: {
          id: DEFAULT_TENANT_ID,
          name: 'Sentra AI',
          slug: 'sentra-ai',
          is_active: true,
        },
      });
      logger.info('Default tenant created');
    }
  } catch (err) {
    logger.warn('Could not ensure default tenant:', err);
  }
}

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, fullName, role } = req.body;

    const existingUser = await prisma.users.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    await ensureDefaultTenant();

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.users.create({
      data: {
        id: randomUUID(),
        email,
        password_hash: passwordHash,
        full_name: fullName,
        role: role || 'USER',
        is_active: true,
        tenant_id: DEFAULT_TENANT_ID,
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
    const accessToken = generateAccessToken({ id: user.id, role });
    const refreshToken = generateRefreshToken({ id: user.id });

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
          tenant_id: user.tenant_id,
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

    const storedToken = await prisma.refreshToken.findUnique({ where: { token } });
    if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    const payload: any = verifyRefreshToken(token);
    const user = await prisma.users.findUnique({ where: { id: payload.id } });

    if (!user) return res.status(401).json({ success: false, message: 'User not found' });

    const newAccessToken = generateAccessToken({ id: user.id, role: user.role || 'USER' });

    res.status(200).json({
      success: true,
      data: { accessToken: newAccessToken },
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
        tenant_id: user.tenant_id,
        is_active: user.is_active,
      },
    });
  } catch (error) {
    next(error);
  }
};

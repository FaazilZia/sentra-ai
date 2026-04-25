import { Request, Response, NextFunction } from 'express'; // Refreshing TS Server Context
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import prisma from '../config/db';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import logger from '../utils/logger';
import { auditLogger } from '../utils/auditLogger';
import { OAuth2Client } from 'google-auth-library';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);



export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, fullName, organizationName } = req.body;

    const existingUser = await prisma.users.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Generate a URL-safe slug from the org name
    const baseSlug = organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Ensure slug uniqueness
    let slug = baseSlug;
    let slugSuffix = 1;
    while (await prisma.organizations.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${slugSuffix++}`;
    }

    const passwordHash = await bcrypt.hash(password, 12); // 12 rounds for production

    // Create org and user in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organizations.create({
        data: {
          id: randomUUID(),
          name: organizationName,
          slug,
          is_active: true,
        },
      });

      const user = await tx.users.create({
        data: {
          id: randomUUID(),
          email,
          password_hash: passwordHash,
          full_name: fullName,
          role: 'ADMIN', // First user of an org is always admin
          is_active: true,
          organizationId: org.id,
        },
      });

      return { org, user };
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.full_name,
        role: result.user.role,
        organizationId: result.org.id,
        organizationName: result.org.name,
      },
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

    if (!user.password_hash) {
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
      organizationId: user.organizationId,
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

export const googleLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { idToken, organizationName } = req.body;
    if (!idToken) {
      return res.status(400).json({ success: false, message: 'Google ID Token required' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({ success: false, message: 'Invalid Google Token' });
    }

    const { email, name } = payload;

    let user = await prisma.users.findUnique({ where: { email } });

    if (!user) {
      // New Google user — require org name
      if (!organizationName || organizationName.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Organization name is required for new accounts',
          requiresOrganizationName: true,
        });
      }

      const baseSlug = organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      let slug = baseSlug;
      let slugSuffix = 1;
      while (await prisma.organizations.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${slugSuffix++}`;
      }

      const result = await prisma.$transaction(async (tx) => {
        const org = await tx.organizations.create({
          data: { id: randomUUID(), name: organizationName, slug, is_active: true },
        });
        const newUser = await tx.users.create({
          data: {
            id: randomUUID(),
            email,
            full_name: name || email.split('@')[0],
            role: 'ADMIN',
            is_active: true,
            organizationId: org.id,
          },
        });
        return newUser;
      });
      user = result;
    }

    const role = user.role || 'USER';
    const accessToken = generateAccessToken({ id: user.id, role, organizationId: user.organizationId });
    const refreshToken = generateRefreshToken({ id: user.id, organizationId: user.organizationId });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt } });

    res.status(200).json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: { id: user.id, email: user.email, fullName: user.full_name, role, organizationId: user.organizationId },
      },
    });
  } catch (error) {
    logger.error('Google Login Error:', error);
    res.status(401).json({ success: false, message: 'Google authentication failed' });
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

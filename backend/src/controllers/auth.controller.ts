import { Request, Response, NextFunction } from 'express'; // Refreshing TS Server Context
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import prisma from '../config/db';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, generateCustomToken, verifyCustomToken } from '../utils/jwt';
import logger from '../utils/logger';
import { auditLogger } from '../utils/auditLogger';
import { OAuth2Client } from 'google-auth-library';
import { getRedisClient } from '../config/redis';
import { sendEmail } from '../config/email';

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALLBACK_URL
);

const seedDefaultPolicy = async (tx: any, organizationId: string) => {
  const policyId = randomUUID();
  await tx.policies.create({
    data: {
      id: policyId,
      organizationId,
      name: 'Default Protection Policy',
      description: 'Blocks prompt injections and suspicious keywords',
      enabled: true,
      priority: 1,
      effect: 'BLOCK',
      status: 'published',
      current_version: 1,
      scope: { agents: ['All Agents'] },
      conditions: {
        input: {
          contains: [
            "ignore previous instructions",
            "act as system",
            "bypass",
            "override",
            "leak data"
          ]
        }
      },
      obligations: { log_violations: true },
      rule: {
        type: "keyword_match",
        keywords: [
          "ignore previous instructions",
          "act as system",
          "bypass",
          "override",
          "leak data"
        ]
      }
    }
  });

  await tx.policy_versions.create({
    data: {
      policy_id: policyId,
      organizationId,
      version: 1,
      name: 'Default Protection Policy',
      description: 'Blocks prompt injections and suspicious keywords',
      effect: 'BLOCK',
      enabled: true,
      priority: 1,
      status: 'published',
      is_published_snapshot: true,
      scope: { agents: ['All Agents'] },
      conditions: {
        input: {
          contains: [
            "ignore previous instructions",
            "act as system",
            "bypass",
            "override",
            "leak data"
          ]
        }
      },
      obligations: { log_violations: true },
    }
  });
};

export const setAuthCookiesAndTokens = async (
  res: Response,
  user: { id: string; role: string; organizationId: string },
  req?: Request,
  logAction?: string
) => {
  const role = user.role || 'USER';
  const accessToken = generateAccessToken({ id: user.id, role, organizationId: user.organizationId });
  const refreshToken = generateRefreshToken({ 
    id: user.id, 
    organizationId: user.organizationId,
    nonce: randomUUID()
  });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt,
    },
  });

  if (logAction && req) {
    await auditLogger.log({
      userId: user.id,
      organizationId: user.organizationId,
      action: logAction,
      metadata: { ip: req.ip }
    });
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    maxAge: number;
    path: string;
  } = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    maxAge: 15 * 60 * 1000,
  };
  res.cookie('sentra_access_token', accessToken, cookieOptions);
  res.cookie('sentra_refresh_token', refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return { accessToken, refreshToken };
};

const generateUniqueOrgSlug = async (email: string, organizationName?: string) => {
  const emailDomain = email.split('@')[1]?.split('.')[0] || 'sentra';
  const derivedOrgName = organizationName?.trim() || 
    (emailDomain.charAt(0).toUpperCase() + emailDomain.slice(1) + ' Org');

  const baseSlug = derivedOrgName
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-|-$/g, '');

  let slug = baseSlug;
  let slugSuffix = 1;
  while (await prisma.organizations.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${slugSuffix++}`;
  }

  return { derivedOrgName, slug };
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, fullName, organizationName } = req.body;

    const existingUser = await prisma.users.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const { derivedOrgName, slug } = await generateUniqueOrgSlug(email, organizationName);

    const passwordHash = await bcrypt.hash(password, 12); // 12 rounds for production

    // Create org and user in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organizations.create({
        data: {
          id: randomUUID(),
          name: derivedOrgName,
          slug,
          is_active: true,
        },
      });

      const user = await tx.users.create({
        data: {
          id: randomUUID(),
          email,
          password_hash: passwordHash,
          full_name: fullName || email.split('@')[0],
          role: 'ADMIN', // First user of an org is always admin
          is_active: true,
          organizationId: org.id,
          email_verified: false, // Default unverified for email-verification compliance
        },
      });

      await seedDefaultPolicy(tx, org.id);

      return { org, user };
    });

    // Generate signed verification token (24h expiry)
    const tokenJti = randomUUID();
    const verificationToken = generateCustomToken(
      { sub: result.user.id, purpose: 'email-verification', jti: tokenJti },
      '24h'
    );

    // Save JTI reference in Redis if available
    const redis = getRedisClient();
    if (redis) {
      await redis.set(`email-verification:last-jti:${result.user.id}`, tokenJti, 'EX', 86400);
    }

    // Send verification email link
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
    const verifyLink = `${backendUrl}/api/v1/auth/verify-email?token=${verificationToken}`;

    try {
      await sendEmail({
        to: email,
        subject: 'Verify Your Email Address',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
            <h2 style="color: #0f172a; margin-top: 0;">Verify Your Email</h2>
            <p>Welcome to Sentra AI! Please verify your email address by clicking the button below.</p>
            <a href="${verifyLink}" style="display: inline-block; background: #0f172a; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 10px;">Verify Email</a>
            <p style="font-size: 12px; color: #94a3b8; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
              This verification link is valid for 24 hours.
            </p>
          </div>
        `
      });
    } catch (err: any) {
      logger.error(`Failed to send welcome verification email to ${email}: ${err.message}`);
    }

    res.status(201).json({
      success: true,
      message: 'Account created successfully. A verification email has been sent.',
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

    // Require email verification on login
    if (user.email_verified === false) {
      return res.status(403).json({ error: 'Email not verified', code: 'EMAIL_NOT_VERIFIED' });
    }

    const role = user.role || 'USER';
    const { accessToken, refreshToken } = await setAuthCookiesAndTokens(
      res,
      { id: user.id, role, organizationId: user.organizationId },
      req,
      'LOGIN_SUCCESS'
    );

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

    if (!process.env.GOOGLE_CLIENT_ID) {
      logger.error('GOOGLE_CLIENT_ID is not set in environment variables');
      return res.status(500).json({ success: false, message: 'Google authentication is not configured' });
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
      const { derivedOrgName, slug } = await generateUniqueOrgSlug(email, organizationName);

      const result = await prisma.$transaction(async (tx) => {
        const org = await tx.organizations.create({
          data: { id: randomUUID(), name: derivedOrgName, slug, is_active: true },
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
        await seedDefaultPolicy(tx, org.id);
        return newUser;
      });
      user = result;
    }

    const role = user.role || 'USER';
    const { accessToken, refreshToken } = await setAuthCookiesAndTokens(
      res,
      { id: user.id, role, organizationId: user.organizationId },
      req,
      'LOGIN_SUCCESS'
    );

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

export const googleCallback = async (req: Request, res: Response) => {
  // This is a stub for the traditional redirect flow callback
  // Currently, the app uses the frontend-driven One Tap flow.
  // If a 'code' is present, it would be exchanged here.
  const frontendUrl = process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:5173';
  res.redirect(`${frontendUrl}/login?error=callback_not_implemented`);
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

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await setAuthCookiesAndTokens(
      res,
      { id: user.id, role: user.role || 'USER', organizationId: user.organizationId }
    );

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
    const user = await prisma.users.findUnique({ 
      where: { id: req.user.id },
      include: { organizations: true }
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role || 'USER',
        organizationId: user.organizationId,
        organizationName: user.organizations?.name || null,
        is_active: user.is_active,
        avatarUrl: user.avatarUrl,
        jobTitle: user.jobTitle,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new passwords are required' });
    }

    const user = await prisma.users.findUnique({ where: { id: req.user.id } });
    if (!user || !user.password_hash) {
      return res.status(404).json({ success: false, message: 'User not found or password not set' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect current password' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.users.update({
      where: { id: user.id },
      data: {
        password_hash: passwordHash,
        passwordChangedAt: new Date(),
      },
    });

    res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { token: refreshToken },
        data: { revoked: true }
      });
    }

    // Clear HTTP-only cookies
    res.clearCookie('sentra_access_token', { path: '/' });
    res.clearCookie('sentra_refresh_token', { path: '/' });
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    const user = await prisma.users.findUnique({ where: { email } });
    if (!user) {
      // Don't leak existence of email address
      return res.status(200).json({ success: true, message: 'If this email exists, a password reset link has been sent.' });
    }

    const jti = randomUUID();
    const token = generateCustomToken({ sub: user.id, purpose: 'password-reset', jti }, '1h');

    // Save JTI in Redis with 1h TTL to track token use
    const redis = getRedisClient();
    if (redis) {
      await redis.set(`password-reset:last-jti:${user.id}`, jti, 'EX', 3600);
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    try {
      await sendEmail({
        to: email,
        subject: 'Password Reset Request',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
            <h2 style="color: #0f172a; margin-top: 0;">Password Reset Request</h2>
            <p>You requested a password reset for your Sentra AI account.</p>
            <p>Click the button below to reset your password. This link is valid for 1 hour.</p>
            <a href="${resetLink}" style="display: inline-block; background: #0f172a; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 10px;">Reset Password</a>
            <p style="font-size: 12px; color: #94a3b8; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
              If you did not request this, please ignore this email.
            </p>
          </div>
        `
      });
    } catch (err: any) {
      logger.error(`Failed to send password reset email to ${email}: ${err.message}`);
    }

    res.status(200).json({ success: true, message: 'If this email exists, a password reset link has been sent.' });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, newPassword } = req.body;
    const decoded = verifyCustomToken(token);
    
    if (decoded.purpose !== 'password-reset' || !decoded.sub || !decoded.jti) {
      return res.status(400).json({ success: false, message: 'Invalid token purpose or format' });
    }

    const redis = getRedisClient();
    if (redis) {
      const isUsed = await redis.get(`jti:used:${decoded.jti}`);
      if (isUsed) {
        return res.status(400).json({ success: false, message: 'Token has already been used' });
      }
    }

    const user = await prisma.users.findUnique({ where: { id: decoded.sub } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12); // rounds >= 12
    
    await prisma.$transaction(async (tx) => {
      await tx.users.update({
        where: { id: user.id },
        data: {
          password_hash: passwordHash,
          passwordChangedAt: new Date(),
        },
      });

      // Invalidate all active refresh tokens for this user
      await tx.refreshToken.updateMany({
        where: { userId: user.id },
        data: { revoked: true },
      });
    });

    // Mark the reset token as used (store used JTI in Redis with TTL matching token expiry)
    if (redis) {
      await redis.set(`jti:used:${decoded.jti}`, '1', 'EX', 3600);
    }

    res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
  }
};

export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, message: 'Verification token is required' });
    }

    const decoded = verifyCustomToken(token);
    if (decoded.purpose !== 'email-verification' || !decoded.sub || !decoded.jti) {
      return res.status(400).json({ success: false, message: 'Invalid token purpose or format' });
    }

    const redis = getRedisClient();
    if (redis) {
      const isUsed = await redis.get(`jti:used:${decoded.jti}`);
      if (isUsed) {
        return res.status(400).json({ success: false, message: 'Verification link has already been used' });
      }
    }

    const user = await prisma.users.findUnique({ where: { id: decoded.sub } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await prisma.users.update({
      where: { id: user.id },
      data: { email_verified: true },
    });

    if (redis) {
      await redis.set(`jti:used:${decoded.jti}`, '1', 'EX', 86400);
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/login?verified=true`);
  } catch (error) {
    res.status(400).json({ success: false, message: 'Invalid or expired verification token' });
  }
};

export const resendVerification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    const user = await prisma.users.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.email_verified) {
      return res.status(400).json({ success: false, message: 'Email is already verified' });
    }

    const tokenJti = randomUUID();
    const redis = getRedisClient();
    if (redis) {
      // Invalidate previous verification tokens
      const previousJti = await redis.get(`email-verification:last-jti:${user.id}`);
      if (previousJti) {
        await redis.set(`jti:used:${previousJti}`, '1', 'EX', 86400);
      }
      await redis.set(`email-verification:last-jti:${user.id}`, tokenJti, 'EX', 86400);
    }

    const verificationToken = generateCustomToken(
      { sub: user.id, purpose: 'email-verification', jti: tokenJti },
      '24h'
    );

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
    const verifyLink = `${backendUrl}/api/v1/auth/verify-email?token=${verificationToken}`;

    try {
      await sendEmail({
        to: email,
        subject: 'Verify Your Email Address',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
            <h2 style="color: #0f172a; margin-top: 0;">Verify Your Email</h2>
            <p>Welcome to Sentra AI! Please verify your email address by clicking the button below.</p>
            <a href="${verifyLink}" style="display: inline-block; background: #0f172a; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 10px;">Verify Email</a>
            <p style="font-size: 12px; color: #94a3b8; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
              This verification link is valid for 24 hours.
            </p>
          </div>
        `
      });
    } catch (err: any) {
      logger.error(`Failed to resend verification email to ${email}: ${err.message}`);
    }

    res.status(200).json({ success: true, message: 'Verification email resent successfully' });
  } catch (error) {
    next(error);
  }
};

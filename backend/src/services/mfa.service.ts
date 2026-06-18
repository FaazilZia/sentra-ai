import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import bcrypt from 'bcrypt';
import prisma from '../config/db';
import logger from '../utils/logger';
import { encrypt, decrypt } from '../utils/encryption';

const MFA_ISSUER = process.env.APP_NAME || 'Sentraa AI';

export const MFAService = {
  /**
   * Generate a new TOTP secret and QR code for a user.
   * Does NOT enable MFA yet — user must verify first.
   */
  async setupMFA(userId: string, email: string): Promise<{ secret: string; qrCodeUrl: string; manualKey: string }> {
    const secret = speakeasy.generateSecret({
      name: `${MFA_ISSUER} (${email})`,
      issuer: MFA_ISSUER,
      length: 20,
    });

    // Store encrypted temp secret (not yet enabled)
    const encryptedSecret = encrypt(secret.base32);
    await prisma.users.update({
      where: { id: userId },
      data: { mfa_secret: encryptedSecret },
    });

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    return {
      secret: secret.base32,
      qrCodeUrl,
      manualKey: secret.base32,
    };
  },

  /**
   * Verify a TOTP token and enable MFA for the user.
   * Returns recovery codes on first enable.
   */
  async enableMFA(userId: string, token: string): Promise<{ recoveryCodes: string[] }> {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { mfa_secret: true },
    });
    if (!user?.mfa_secret) throw new Error('MFA setup not initiated');

    const secret = decrypt(user.mfa_secret);
    const isValid = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 time steps (60 seconds tolerance)
    });

    if (!isValid) throw new Error('Invalid MFA token');

    // Generate recovery codes
    const recoveryCodes: string[] = [];
    const hashedCodes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(5).toString('hex').toUpperCase();
      const formatted = `${code.slice(0, 5)}-${code.slice(5)}`;
      recoveryCodes.push(formatted);
      hashedCodes.push(await bcrypt.hash(formatted, 10));
    }

    await prisma.users.update({
      where: { id: userId },
      data: {
        mfa_enabled: true,
        mfa_recovery_codes: hashedCodes,
      },
    });

    logger.info(`[MFA] Enabled for user ${userId}`);
    return { recoveryCodes };
  },

  /**
   * Verify a TOTP token for login.
   */
  async verifyToken(userId: string, token: string): Promise<boolean> {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { mfa_enabled: true, mfa_secret: true, mfa_recovery_codes: true },
    });

    if (!user?.mfa_enabled || !user.mfa_secret) return false;

    const secret = decrypt(user.mfa_secret);

    // Check TOTP token
    const isValid = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2,
    });
    if (isValid) return true;

    // Check recovery codes
    for (let i = 0; i < user.mfa_recovery_codes.length; i++) {
      const isRecovery = await bcrypt.compare(token, user.mfa_recovery_codes[i]);
      if (isRecovery) {
        // Invalidate used recovery code
        const remaining = [...user.mfa_recovery_codes];
        remaining.splice(i, 1);
        await prisma.users.update({
          where: { id: userId },
          data: { mfa_recovery_codes: remaining },
        });
        logger.info(`[MFA] Recovery code used for user ${userId}`);
        return true;
      }
    }

    return false;
  },

  /**
   * Disable MFA for a user (requires password confirmation in controller).
   */
  async disableMFA(userId: string): Promise<void> {
    await prisma.users.update({
      where: { id: userId },
      data: {
        mfa_enabled: false,
        mfa_secret: null,
        mfa_recovery_codes: [],
      },
    });
    logger.info(`[MFA] Disabled for user ${userId}`);
  },

  /**
   * Check if MFA is enabled for a user.
   */
  async isMFAEnabled(userId: string): Promise<boolean> {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { mfa_enabled: true },
    });
    return user?.mfa_enabled ?? false;
  },
};

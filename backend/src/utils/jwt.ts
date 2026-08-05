import jwt, { SignOptions } from 'jsonwebtoken';
import logger from './logger';

const DEV_FALLBACK_SECRET = 'dev_jwt_secret_sentra_ai_fallback_32_bytes_min';
const DEV_REFRESH_FALLBACK = 'dev_refresh_secret_sentra_ai_fallback_32_bytes_min';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('CRITICAL: JWT_SECRET is missing in production environment!');
      process.exit(1);
    }
    return DEV_FALLBACK_SECRET;
  }
  return secret;
}

function getRefreshSecret(): string {
  const secret = process.env.REFRESH_SECRET || process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('CRITICAL: REFRESH_SECRET is missing in production environment!');
      process.exit(1);
    }
    return DEV_REFRESH_FALLBACK;
  }
  return secret;
}

export const generateAccessToken = (payload: object): string => {
  const options: SignOptions = { expiresIn: '15m' };
  return jwt.sign(payload, getJwtSecret(), options);
};

export const generateRefreshToken = (payload: object): string => {
  const options: SignOptions = { expiresIn: '7d' };
  return jwt.sign(payload, getRefreshSecret(), options);
};

export const verifyAccessToken = (token: string): jwt.JwtPayload | string => {
  return jwt.verify(token, getJwtSecret());
};

export const verifyRefreshToken = (token: string): jwt.JwtPayload | string => {
  return jwt.verify(token, getRefreshSecret());
};

export const generateCustomToken = (payload: object, expiresIn: string): string => {
  const options: SignOptions = { expiresIn: expiresIn as any };
  return jwt.sign(payload, getJwtSecret(), options);
};

export const verifyCustomToken = (token: string): jwt.JwtPayload => {
  const decoded = jwt.verify(token, getJwtSecret());
  if (typeof decoded === 'string') {
    throw new Error('Invalid token format');
  }
  return decoded;
};

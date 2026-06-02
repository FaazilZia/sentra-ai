import jwt, { SignOptions } from 'jsonwebtoken';
import logger from './logger';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;

if (!JWT_SECRET || !REFRESH_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    logger.error('CRITICAL: JWT_SECRET or REFRESH_SECRET is missing in production environment!');
    process.exit(1);
  } else {
    logger.warn('JWT_SECRET or REFRESH_SECRET is missing. Falling back to development defaults.');
  }
}

// Generate dynamic 256-bit fallback secret at runtime to eliminate hardcoded string secrets
const dynamicFallback = crypto.randomBytes(32).toString('hex');
const FINAL_JWT_SECRET = JWT_SECRET || dynamicFallback;
const FINAL_REFRESH_SECRET = REFRESH_SECRET || dynamicFallback;

export const generateAccessToken = (payload: object): string => {
  const options: SignOptions = { expiresIn: '15m' };
  return jwt.sign(payload, FINAL_JWT_SECRET, options);
};

export const generateRefreshToken = (payload: object): string => {
  const options: SignOptions = { expiresIn: '7d' };
  return jwt.sign(payload, FINAL_REFRESH_SECRET, options);
};

export const verifyAccessToken = (token: string): jwt.JwtPayload | string => {
  return jwt.verify(token, FINAL_JWT_SECRET);
};

export const verifyRefreshToken = (token: string): jwt.JwtPayload | string => {
  return jwt.verify(token, FINAL_REFRESH_SECRET);
};

export const generateCustomToken = (payload: object, expiresIn: string): string => {
  const options: SignOptions = { expiresIn: expiresIn as any };
  return jwt.sign(payload, FINAL_JWT_SECRET, options);
};

export const verifyCustomToken = (token: string): jwt.JwtPayload => {
  const decoded = jwt.verify(token, FINAL_JWT_SECRET);
  if (typeof decoded === 'string') {
    throw new Error('Invalid token format');
  }
  return decoded;
};

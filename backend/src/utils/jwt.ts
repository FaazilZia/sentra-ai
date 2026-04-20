import jwt, { SignOptions } from 'jsonwebtoken';
import logger from './logger';

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

const FINAL_JWT_SECRET = JWT_SECRET || 'dev_jwt_secret_do_not_use_in_prod';
const FINAL_REFRESH_SECRET = REFRESH_SECRET || 'dev_refresh_secret_do_not_use_in_prod';

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

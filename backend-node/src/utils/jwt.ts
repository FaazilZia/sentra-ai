import jwt, { SignOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'sentra_jwt_secret_change_in_production';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'sentra_refresh_secret_change_in_production';

export const generateAccessToken = (payload: object): string => {
  const options: SignOptions = { expiresIn: '15m' };
  return jwt.sign(payload, JWT_SECRET, options);
};

export const generateRefreshToken = (payload: object): string => {
  const options: SignOptions = { expiresIn: '7d' };
  return jwt.sign(payload, REFRESH_SECRET, options);
};

export const verifyAccessToken = (token: string): jwt.JwtPayload | string => {
  return jwt.verify(token, JWT_SECRET);
};

export const verifyRefreshToken = (token: string): jwt.JwtPayload | string => {
  return jwt.verify(token, REFRESH_SECRET);
};

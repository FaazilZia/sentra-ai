import { z } from 'zod';
import nodemailer from 'nodemailer';
import logger from '../utils/logger';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  REFRESH_SECRET: z.string().min(1, 'REFRESH_SECRET is required'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
});

export const validateEnv = async () => {
  try {
    // 1. Zod validation
    envSchema.parse(process.env);

    // 2. Production strict checks & dynamic SMTP transporter verify
    if (process.env.NODE_ENV === 'production' && process.env.SMTP_HOST) {
      const smtpVars = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
      for (const key of smtpVars) {
        const val = process.env[key] || '';
        if (!val || /example|placeholder|changeme|your_/i.test(val)) {
          throw new Error(`${key} appears to be a placeholder value. Set real SMTP credentials in production.`);
        }
      }

      // Attempt a real SMTP connection verify on startup
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || '587'),
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      });

      try {
        await transporter.verify();
        logger.info('SMTP connection verified successfully on startup');
      } catch (err: any) {
        logger.error('CRITICAL SMTP Connection Verification Failed:', err);
        process.exit(1);
      }
    }
  } catch (error: any) {
    logger.error('CRITICAL Configuration Validation Failed:', error.message || error);
    process.exit(1);
  }
};
export default validateEnv;

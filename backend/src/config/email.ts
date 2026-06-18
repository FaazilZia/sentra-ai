import nodemailer from 'nodemailer';
import logger from '../utils/logger';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

export const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: SMTP_USER && SMTP_PASS ? {
    user: SMTP_USER,
    pass: SMTP_PASS,
  } : undefined,
});

export const sendEmail = async (options: { to: string; subject: string; html: string }) => {
  const from = process.env.SMTP_FROM || '"Sentraa AI" <noreply@sentra.ai>';
  try {
    const info = await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    logger.info('Email sent successfully', { messageId: info.messageId, to: options.to });
    return info;
  } catch (error: any) {
    logger.error('Failed to send email', { error: error.message, to: options.to });
    throw error;
  }
};

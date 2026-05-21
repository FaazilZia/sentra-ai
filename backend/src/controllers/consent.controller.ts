import { Response } from 'express';
import { randomUUID, createHash } from 'crypto';
import prisma from '../config/db';
import { asyncHandler, sendSuccess } from '../utils/controllerHelpers';

export const getConsentHistory = asyncHandler(async (req: any, res: Response) => {
  const history = await prisma.consent_records.findMany({
    where: { user_id: req.user.id },
    orderBy: { created_at: 'desc' },
  });

  const formattedHistory = history.map(record => ({
    id: record.id,
    action: record.action,
    timestamp: record.created_at,
    version: record.notice_version,
    hash: record.hashing_chain,
  }));

  return sendSuccess(res, formattedHistory);
});

export const grantConsent = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.id;
  const action = 'GRANT';
  const noticeVersion = '1.0.0';
  
  const timestamp = new Date().toISOString();
  const hashInput = `${userId}-${action}-${timestamp}-${noticeVersion}`;
  const hash = createHash('sha256').update(hashInput).digest('hex');

  await prisma.consent_records.create({
    data: {
      id: randomUUID(),
      user_id: userId,
      action,
      notice_version: noticeVersion,
      hashing_chain: hash,
      metadata_json: { ip: req.ip, userAgent: req.get('user-agent') },
    },
  });

  return sendSuccess(res, undefined, 201, 'Consent granted successfully');
});

export const withdrawConsent = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.id;
  const action = 'WITHDRAW';
  const noticeVersion = '1.0.0';
  
  const timestamp = new Date().toISOString();
  const hashInput = `${userId}-${action}-${timestamp}-${noticeVersion}`;
  const hash = createHash('sha256').update(hashInput).digest('hex');

  await prisma.consent_records.create({
    data: {
      id: randomUUID(),
      user_id: userId,
      action,
      notice_version: noticeVersion,
      hashing_chain: hash,
      metadata_json: { ip: req.ip, userAgent: req.get('user-agent'), reason: 'user_request' },
    },
  });
  
  return sendSuccess(res, undefined, 201, 'Consent withdrawn successfully');
});

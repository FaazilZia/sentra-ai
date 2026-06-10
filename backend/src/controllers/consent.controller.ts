import { Response } from 'express';
import { randomUUID, createHash } from 'crypto';
import prisma from '../config/db';
import { asyncHandler, sendSuccess, sendError } from '../utils/controllerHelpers';
import { parseCursorPagination } from '../utils/pagination';

const createConsentRecord = async (
  userId: string,
  action: 'GRANT' | 'WITHDRAW',
  noticeVersion: string,
  req: any,
  extraMetadata: Record<string, any> = {}
) => {
  const timestamp = new Date().toISOString();
  const hashInput = `${userId}-${action}-${timestamp}-${noticeVersion}`;
  const hash = createHash('sha256').update(hashInput).digest('hex');

  return await prisma.consent_records.create({
    data: {
      id: randomUUID(),
      user_id: userId,
      action,
      notice_version: noticeVersion,
      hashing_chain: hash,
      metadata_json: {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        ...extraMetadata
      },
    },
  });
};

export const getConsentHistory = asyncHandler(async (req: any, res: Response) => {
  let limit: number;
  let cursor: string | undefined;

  try {
    const parsed = parseCursorPagination(req.query);
    limit = parsed.limit;
    cursor = parsed.cursor;
  } catch (err: any) {
    return sendError(res, 400, err.message);
  }

  const total = await prisma.consent_records.count({
    where: { user_id: req.user.id },
  });

  const history = await prisma.consent_records.findMany({
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    where: { user_id: req.user.id },
    orderBy: { created_at: 'desc' },
  });

  const hasMore = history.length > limit;
  const data = hasMore ? history.slice(0, -1) : history;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  const formattedHistory = data.map(record => ({
    id: record.id,
    action: record.action,
    timestamp: record.created_at,
    version: record.notice_version,
    hash: record.hashing_chain,
  }));

  if (!req.query.limit && !req.query.cursor) {
    return sendSuccess(res, formattedHistory);
  }

  return sendSuccess(res, { data: formattedHistory, nextCursor, total });
});

export const grantConsent = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.id;
  const action = 'GRANT';
  const noticeVersion = req.body.notice_version || req.body.noticeVersion || '1.0.0';
  
  const latest = await prisma.consent_records.findFirst({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
  });

  if (latest?.action === action) {
    return sendSuccess(res, undefined, 200, 'Consent already granted');
  }

  await createConsentRecord(userId, action, noticeVersion, req);

  return sendSuccess(res, undefined, 201, 'Consent granted successfully');
});

export const withdrawConsent = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.id;
  const action = 'WITHDRAW';
  const noticeVersion = req.body.notice_version || req.body.noticeVersion || '1.0.0';
  
  const latest = await prisma.consent_records.findFirst({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
  });

  if (latest?.action === action) {
    return sendSuccess(res, undefined, 200, 'Consent already withdrawn');
  }

  await createConsentRecord(userId, action, noticeVersion, req, { reason: 'user_request' });
  
  return sendSuccess(res, undefined, 201, 'Consent withdrawn successfully');
});

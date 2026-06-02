import { Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import prisma from '../config/db';
import { resolveOrganizationId } from '../utils/company';
import { asyncHandler, sendSuccess, sendError } from '../utils/controllerHelpers';

import { parseCursorPagination } from '../utils/pagination';

export const listApiKeys = asyncHandler(async (req: any, res: Response) => {
  let limit: number;
  let cursor: string | undefined;

  try {
    const parsed = parseCursorPagination(req.query);
    limit = parsed.limit;
    cursor = parsed.cursor;
  } catch (err: any) {
    return sendError(res, 400, err.message);
  }

  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) {
    return sendSuccess(res, { data: [], nextCursor: null, total: 0 });
  }

  const total = await prisma.api_keys.count({
    where: { organizationId, is_active: true },
  });

  const keys = await prisma.api_keys.findMany({
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    where: { organizationId, is_active: true },
    orderBy: { created_at: 'desc' },
    select: {
      id: true,
      name: true,
      key_prefix: true,
      created_at: true,
    },
  });

  const hasMore = keys.length > limit;
  const data = hasMore ? keys.slice(0, -1) : keys;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  return sendSuccess(res, { data, nextCursor, total });
});

export const createApiKey = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) {
    return sendError(res, 400, 'Company context required');
  }

  const { name } = req.body as { name: string };
  const prefix = crypto.randomBytes(4).toString('hex');
  const secret = crypto.randomBytes(24).toString('base64url');
  const fullKey = `sentra_${prefix}_${secret}`;
  const key_hash = await bcrypt.hash(fullKey, 10);

  const row = await prisma.api_keys.create({
    data: {
      id: crypto.randomUUID(),
      organizationId,
      name,
      key_prefix: prefix,
      key_hash,
      key_type: 'service',
      is_active: true,
    },
  });

  return sendSuccess(res, {
    api_key: fullKey,
    name: row.name,
    id: row.id,
    key_prefix: row.key_prefix,
  }, 201);
});

export const deleteApiKey = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) {
    return sendError(res, 400, 'Company context required');
  }

  const keyId = String(req.params['keyId'] ?? '');

  const existing = await prisma.api_keys.findFirst({
    where: { id: keyId, organizationId },
  });
  if (!existing) {
    return sendError(res, 404, 'API key not found');
  }

  await prisma.api_keys.update({
    where: { id: keyId },
    data: { is_active: false },
  });

  return sendSuccess(res, undefined, 200, 'API key revoked');
});

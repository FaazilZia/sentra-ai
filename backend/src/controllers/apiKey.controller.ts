import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import prisma from '../config/db';
import { resolveTenantId } from '../utils/tenant';

export const listApiKeys = async (req: any, res: Response, next: NextFunction) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return res.status(200).json({ success: true, data: [] });
    }

    const keys = await prisma.api_keys.findMany({
      where: { tenant_id: tenantId, is_active: true },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        name: true,
        key_prefix: true,
        created_at: true,
      },
    });

    res.status(200).json({ success: true, data: keys });
  } catch (error) {
    next(error);
  }
};

export const createApiKey = async (req: any, res: Response, next: NextFunction) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant context required' });
    }

    const { name } = req.body as { name: string };
    const prefix = crypto.randomBytes(4).toString('hex');
    const secret = crypto.randomBytes(24).toString('base64url');
    const fullKey = `sentra_${prefix}_${secret}`;
    const key_hash = await bcrypt.hash(fullKey, 10);

    const row = await prisma.api_keys.create({
      data: {
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        name,
        key_prefix: prefix,
        key_hash,
        key_type: 'service',
        is_active: true,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        api_key: fullKey,
        name: row.name,
        id: row.id,
        key_prefix: row.key_prefix,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteApiKey = async (req: any, res: Response, next: NextFunction) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant context required' });
    }

    const keyId = String(req.params['keyId'] ?? '');

    const existing = await prisma.api_keys.findFirst({
      where: { id: keyId, tenant_id: tenantId },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'API key not found' });
    }

    await prisma.api_keys.update({
      where: { id: keyId },
      data: { is_active: false },
    });

    res.status(200).json({ success: true, message: 'API key revoked' });
  } catch (error) {
    next(error);
  }
};

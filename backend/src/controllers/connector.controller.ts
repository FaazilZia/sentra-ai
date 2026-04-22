import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import prisma from '../config/db';
import { resolveOrganizationId } from '../utils/company';

export const listConnectors = async (req: any, res: Response, next: NextFunction) => {
  try {
    const organizationId = await resolveOrganizationId(req);
    if (!organizationId) {
      return res.status(200).json({ success: true, data: { items: [] } });
    }

    const rows = await prisma.connectors.findMany({
      where: { organizationId: organizationId },
      orderBy: { created_at: 'desc' },
    });

    res.status(200).json({ success: true, data: { items: rows } });
  } catch (error) {
    next(error);
  }
};

export const createConnector = async (req: any, res: Response, next: NextFunction) => {
  try {
    const organizationId = await resolveOrganizationId(req);
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'Company context required' });
    }

    const { name, type, config } = req.body as {
      name: string;
      type: 'sql' | 'gdrive' | 's3' | 'local';
      config?: Record<string, unknown>;
    };

    const row = await prisma.connectors.create({
      data: {
        id: crypto.randomUUID(),
        organizationId: organizationId,
        name,
        type,
        config: (config || {}) as object,
        status: 'pending',
        last_scan_at: null,
      },
    });

    res.status(201).json({
      success: true,
      data: row,
    });
  } catch (error) {
    next(error);
  }
};

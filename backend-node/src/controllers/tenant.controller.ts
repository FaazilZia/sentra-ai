import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { resolveTenantId } from '../utils/tenant';

export const getTenantById = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const requestTenantId = await resolveTenantId(req);
    if (requestTenantId && id !== requestTenantId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const tenant = await prisma.tenants.findUnique({
      where: { id },
    });

    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    res.status(200).json({
      success: true,
      data: tenant,
    });
  } catch (error) {
    next(error);
  }
};

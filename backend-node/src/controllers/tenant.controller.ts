import { Response, NextFunction } from 'express';
import prisma from '../config/db';

export const getTenantById = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
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

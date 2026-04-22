import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { resolveOrganizationId } from '../utils/company';

export const getOrganizationById = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const requestOrganizationId = await resolveOrganizationId(req);
    if (requestOrganizationId && id !== requestOrganizationId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const company = await prisma.organizations.findUnique({
      where: { id },
    });

    if (!company) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    res.status(200).json({
      success: true,
      data: company,
    });
  } catch (error) {
    next(error);
  }
};

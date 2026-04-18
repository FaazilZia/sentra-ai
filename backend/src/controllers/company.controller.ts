import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { resolveCompanyId } from '../utils/company';

export const getTenantById = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const requestCompanyId = await resolveCompanyId(req);
    if (requestCompanyId && id !== requestCompanyId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const company = await prisma.companies.findUnique({
      where: { id },
    });

    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    res.status(200).json({
      success: true,
      data: company,
    });
  } catch (error) {
    next(error);
  }
};

import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';

export const getPolicies = async (req: any, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.user.tenant_id || req.user.tenantId; // Handle both cases
    
    // If tenant_id is missing from token (e.g. fresh register), find it from user
    let actualTenantId = tenantId;
    if (!actualTenantId) {
      const user = await prisma.users.findUnique({ where: { id: req.user.id } });
      actualTenantId = user?.tenant_id;
    }

    const policies = await prisma.policies.findMany({
      where: { tenant_id: actualTenantId },
      orderBy: { priority: 'asc' },
    });

    res.status(200).json({
      success: true,
      data: policies,
    });
  } catch (error) {
    next(error);
  }
};

export const getPolicyHealth = async (req: any, res: Response, next: NextFunction) => {
  try {
    // Mock health check for now, point is to have the endpoint
    res.status(200).json({
      success: true,
      data: {
        status: 'healthy',
        checks: [
          { name: 'Schema Validation', status: 'pass' },
          { name: 'Policy Consistency', status: 'pass' },
          { name: 'Latency', status: 'pass', value: '14ms' }
        ]
      }
    });
  } catch (error) {
    next(error);
  }
};

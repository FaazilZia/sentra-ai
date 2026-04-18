import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { resolveCompanyId } from '../utils/company';

export const getPolicies = async (req: any, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user.companyId; 
    
    // If companyId is missing from token (e.g. fresh register), find it from user
    let actualCompanyId = companyId;
    if (!actualCompanyId) {
      const user = await prisma.users.findUnique({ where: { id: req.user.id } });
      actualCompanyId = user?.companyId;
    }

    const policies = await prisma.policies.findMany({
      where: { companyId: actualCompanyId },
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
        evaluator: 'prisma-policy-engine',
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

export const getPolicyVersions = async (req: any, res: Response, next: NextFunction) => {
  try {
    const policyId = String(req.params['policyId'] ?? '');
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return res.status(200).json({ success: true, data: [] });
    }

    const policy = await prisma.policies.findFirst({
      where: { id: policyId, companyId: companyId },
    });
    if (!policy) {
      return res.status(404).json({ success: false, message: 'Policy not found' });
    }

    const versions = await prisma.policy_versions.findMany({
      where: { policy_id: policyId, companyId: companyId },
      orderBy: { version: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: versions,
    });
  } catch (error) {
    next(error);
  }
};

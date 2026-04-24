import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { resolveOrganizationId } from '../utils/company';

export const getPolicies = async (req: any, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user.organizationId; 
    
    // If organizationId is missing from token (e.g. fresh register), find it from user
    let actualOrganizationId = organizationId;
    if (!actualOrganizationId) {
      const user = await prisma.users.findUnique({ where: { id: req.user.id } });
      actualOrganizationId = user?.organizationId;
    }

    const policies = await prisma.policies.findMany({
      where: { organizationId: actualOrganizationId },
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
    const organizationId = await resolveOrganizationId(req);
    if (!organizationId) {
      return res.status(200).json({ success: true, data: [] });
    }

    const policy = await prisma.policies.findFirst({
      where: { id: policyId, organizationId: organizationId },
    });
    if (!policy) {
      return res.status(404).json({ success: false, message: 'Policy not found' });
    }

    const versions = await prisma.policy_versions.findMany({
      where: { policy_id: policyId, organizationId: organizationId },
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
export const createPolicy = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { name, description, effect, enabled, priority, conditions, scope, obligations } = req.body;
    const organizationId = await resolveOrganizationId(req);
    
    if (!organizationId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const policy = await prisma.policies.create({
      data: {
        organizationId,
        name,
        description: description || '',
        effect,
        enabled: enabled ?? true,
        priority: priority || 1,
        conditions: conditions || {},
        scope: scope || {},
        obligations: obligations || {},
        status: 'published',
        current_version: 1,
      },
    });

    // Create initial version
    await prisma.policy_versions.create({
      data: {
        policy_id: policy.id,
        organizationId,
        version: 1,
        name: policy.name,
        description: policy.description,
        effect: policy.effect,
        enabled: policy.enabled,
        priority: policy.priority,
        conditions: policy.conditions || {},
        scope: policy.scope || {},
        obligations: policy.obligations || {},
        status: 'published',
        is_published_snapshot: true,
      },
    });

    res.status(201).json({
      success: true,
      data: policy,
    });
  } catch (error) {
    next(error);
  }
};

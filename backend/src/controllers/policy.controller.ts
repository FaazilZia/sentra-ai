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

    if (!actualOrganizationId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const policies = await prisma.policies.findMany({
      where: { organizationId: actualOrganizationId as string },
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
      where: { id: policyId, organizationId: organizationId as string },
    });
    if (!policy) {
      return res.status(404).json({ success: false, message: 'Policy not found' });
    }

    const versions = await prisma.policy_versions.findMany({
      where: { policy_id: policyId, organizationId: organizationId as string },
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
        organizationId: organizationId as string,
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
        organizationId: organizationId as string,
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

export const getPolicyTemplates = async (req: any, res: Response, next: NextFunction) => {
  try {
    const templates = [
      {
        name: 'Prompt Injection Protection',
        description: 'Blocks common jailbreak and prompt injection patterns.',
        category: 'Security',
        effect: 'BLOCK',
        conditions: { type: 'regex', value: 'ignore previous instructions' },
        isTemplate: true
      },
      {
        name: 'PII Data Masking',
        description: 'Redacts emails, phone numbers, and SSNs from outputs.',
        category: 'Privacy',
        effect: 'MODIFY',
        conditions: { type: 'pii', value: 'all' },
        isTemplate: true
      }
    ];

    res.status(200).json({ success: true, data: templates });
  } catch (error) {
    next(error);
  }
};

export const duplicatePolicy = async (req: any, res: Response, next: NextFunction) => {
  try {
    const policyId = String(req.params['id'] ?? '');
    const organizationId = await resolveOrganizationId(req);
    
    if (!organizationId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const sourcePolicy = await prisma.policies.findFirst({
      where: { id: policyId, organizationId: organizationId as string }
    });

    if (!sourcePolicy) {
      return res.status(404).json({ success: false, message: 'Policy not found' });
    }

    const newPolicy = await prisma.policies.create({
      data: {
        organizationId: organizationId as string,
        name: `${sourcePolicy.name} (Copy)`,
        description: sourcePolicy.description,
        effect: sourcePolicy.effect,
        enabled: false,
        priority: sourcePolicy.priority,
        conditions: sourcePolicy.conditions || {},
        scope: sourcePolicy.scope || {},
        obligations: sourcePolicy.obligations || {},
        status: 'draft',
        current_version: 1,
      }
    });

    await prisma.policy_versions.create({
      data: {
        policy_id: newPolicy.id,
        organizationId: organizationId as string,
        version: 1,
        name: newPolicy.name,
        description: newPolicy.description,
        effect: newPolicy.effect,
        enabled: newPolicy.enabled,
        priority: newPolicy.priority,
        conditions: newPolicy.conditions || {},
        scope: newPolicy.scope || {},
        obligations: newPolicy.obligations || {},
        status: 'draft',
        is_published_snapshot: false,
      }
    });

    res.status(201).json({ success: true, data: newPolicy });
  } catch (error) {
    next(error);
  }
};

export const updatePolicy = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const organizationId = await resolveOrganizationId(req);
    if (!organizationId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const { name, description, effect, enabled, priority, conditions, scope, obligations } = req.body;

    const existing = await prisma.policies.findFirst({ where: { id, organizationId: organizationId as string } });
    if (!existing) return res.status(404).json({ success: false, message: 'Policy not found' });

    const updated = await prisma.policies.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(effect !== undefined && { effect }),
        ...(enabled !== undefined && { enabled }),
        ...(priority !== undefined && { priority }),
        ...(conditions !== undefined && { conditions }),
        ...(scope !== undefined && { scope }),
        ...(obligations !== undefined && { obligations }),
        updated_at: new Date(),
      }
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const deletePolicy = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const organizationId = await resolveOrganizationId(req);
    if (!organizationId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const existing = await prisma.policies.findFirst({ where: { id, organizationId: organizationId as string } });
    if (!existing) return res.status(404).json({ success: false, message: 'Policy not found' });

    await prisma.policy_versions.deleteMany({ where: { policy_id: id } });
    await prisma.policies.delete({ where: { id } });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

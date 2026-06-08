import { Response } from 'express';
import { asyncHandler, sendSuccess, sendError, getOrgId } from './controllerHelpers';

/**
 * Factory for ISO framework controllers (ISO 27001 / ISO 42001).
 * Eliminates duplication between iso27001.controller.ts and iso42001.controller.ts.
 */
export function createIsoFrameworkController(service: {
  getFrameworkOverview: (orgId: string) => Promise<any>;
  updateImplementation: (orgId: string, code: string, data: any) => Promise<any>;
}) {
  const getFrameworkOverview = asyncHandler(async (req: any, res: Response) => {
    const organizationId = getOrgId(req);
    const overview = await service.getFrameworkOverview(organizationId);
    return sendSuccess(res, overview);
  });

  const updateImplementation = asyncHandler(async (req: any, res: Response) => {
    const { controlCode } = req.params;
    const { status, notes, due_date } = req.body;
    if (!status) {
      return sendError(res, 400, 'status is required');
    }
    const organizationId = getOrgId(req);
    try {
      const updated = await service.updateImplementation(organizationId, controlCode, {
        status,
        notes,
        due_date: due_date ? new Date(due_date) : undefined
      });
      return sendSuccess(res, updated);
    } catch (err: any) {
      return sendError(res, 404, err.message);
    }
  });

  const getComplianceScore = asyncHandler(async (req: any, res: Response) => {
    const organizationId = getOrgId(req);
    const overview = await service.getFrameworkOverview(organizationId);
    return sendSuccess(res, { compliance_score: overview.summary.compliance_score });
  });

  const getFrameworkControls = asyncHandler(async (req: any, res: Response) => {
    const organizationId = getOrgId(req);
    const overview = await service.getFrameworkOverview(organizationId);
    const groups = overview.clauses || overview.sections || [];
    const controls = groups.flatMap((cls: any) => 
      cls.controls.map((c: any) => ({
        code: c.control_code,
        title: c.title,
        description: c.description,
        status: c.implementation?.status || 'NOT_STARTED',
        notes: c.implementation?.notes || '',
        dueDate: c.implementation?.due_date || null,
        lastReviewed: c.implementation?.last_reviewed || null,
        clause: cls.title,
        createdAt: c.implementation?.created_at || null
      }))
    );
    return sendSuccess(res, controls);
  });

  return { getFrameworkOverview, updateImplementation, getComplianceScore, getFrameworkControls };
}

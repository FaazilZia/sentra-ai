import { Response } from 'express';
import { AuditService } from '../utils/auditLogger';
import { parsePagination } from '../utils/pagination';
import { asyncHandler, sendSuccess, getOrgId } from '../utils/controllerHelpers';

export const getAuditLogs = asyncHandler(async (req: any, res: Response) => {
  const { eventType, userId, resourceType, resourceId, severity, fromDate, toDate, search } = req.query;
  const { page, limit } = parsePagination(req.query, 50, 200);
  const organizationId = getOrgId(req);

  const result = await AuditService.getLogs(organizationId, {
    eventType: eventType as string,
    userId: userId as string,
    resourceType: resourceType as string,
    resourceId: resourceId as string,
    severity: severity as string,
    fromDate: fromDate ? new Date(fromDate as string) : undefined,
    toDate: toDate ? new Date(toDate as string) : undefined,
    page,
    limit,
    search: search as string,
  });

  return sendSuccess(res, result);
});

export const exportAuditLogs = asyncHandler(async (req: any, res: Response) => {
  const { format = 'json', ...filters } = req.query;
  const organizationId = getOrgId(req);
  const data = await AuditService.exportLogs(organizationId, format as 'csv' | 'json', filters);

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);
  } else {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.json"`);
  }
  return res.send(data);
});

export const verifyAuditChain = asyncHandler(async (req: any, res: Response) => {
  const organizationId = getOrgId(req);
  const result = await AuditService.verifyChainIntegrity(organizationId);
  return sendSuccess(res, result);
});

export const getAuditStats = asyncHandler(async (req: any, res: Response) => {
  const organizationId = getOrgId(req);
  const stats = await AuditService.getStats(organizationId);
  return sendSuccess(res, stats);
});

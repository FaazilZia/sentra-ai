import { Response, NextFunction } from 'express';
import { AuditService } from '../utils/auditLogger';
import { parsePagination } from '../utils/pagination';

export const getAuditLogs = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { eventType, userId, resourceType, resourceId, severity, fromDate, toDate, search } = req.query;
    const { page, limit } = parsePagination(req.query, 50, 200);
    const result = await AuditService.getLogs(req.user.organizationId, {
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
    res.json({ success: true, ...result });
  } catch (e) { next(e); }
};

export const exportAuditLogs = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { format = 'json', ...filters } = req.query;
    const data = await AuditService.exportLogs(req.user.organizationId, format as 'csv' | 'json', filters);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.json"`);
    }
    res.send(data);
  } catch (e) { next(e); }
};

export const verifyAuditChain = async (req: any, res: Response, next: NextFunction) => {
  try {
    const result = await AuditService.verifyChainIntegrity(req.user.organizationId);
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
};

export const getAuditStats = async (req: any, res: Response, next: NextFunction) => {
  try {
    const stats = await AuditService.getStats(req.user.organizationId);
    res.json({ success: true, data: stats });
  } catch (e) { next(e); }
};

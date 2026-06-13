import { Response } from 'express';
import { ComplianceService } from '../services/compliance.service';
import { ReportService } from '../services/report.service';
import { EuAiActService } from '../services/euAiAct.service';
import { resolveOrganizationId } from '../utils/company';
import prisma from '../config/db';
import { asyncHandler, sendSuccess, sendError } from '../utils/controllerHelpers';

export const getAuditProof = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');
  
  const proof = await ComplianceService.getAuditProof(organizationId);
  return sendSuccess(res, proof);
});

export const postFixTasks = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');

  const { featureId, actionPlan } = req.body;
  const tasks = await ComplianceService.createFixTasks(featureId, actionPlan, organizationId);
  
  await ComplianceService.logAudit(req.user.id, organizationId, 'CREATE_FIX_TASKS', featureId, { count: tasks.length });

  return sendSuccess(res, tasks, 201);
});

export const getFixTasks = asyncHandler(async (req: any, res: Response) => {
  const { featureId } = req.params;
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');

  const tasks = await ComplianceService.getFixTasks(featureId, organizationId);
  return sendSuccess(res, tasks);
});

export const postEvidence = asyncHandler(async (req: any, res: Response) => {
  const { taskId, type, value, source_type } = req.body;
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');

  const evidence = await ComplianceService.addEvidence(taskId, { type, value, source_type }, req.user.id, organizationId);
  return sendSuccess(res, evidence, 201);
});

export const postReEvaluate = asyncHandler(async (req: any, res: Response) => {
  const { featureId } = req.body;
  if (!featureId) {
    return sendError(res, 400, 'featureId is required in request body');
  }
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');

  const result = await ComplianceService.reEvaluate(featureId, req.user.id, organizationId);
  return sendSuccess(res, result);
});

export const getHistory = asyncHandler(async (req: any, res: Response) => {
  const { featureId } = req.params;
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');

  const history = await ComplianceService.getHistory(featureId, organizationId);
  return sendSuccess(res, history);
});

export const getExportReport = asyncHandler(async (req: any, res: Response) => {
  const { featureId } = req.params;
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');

  const hasAccess = await prisma.compliance_snapshots.findFirst({
    where: { featureId, organizationId }
  });
  if (!hasAccess) {
    return sendError(res, 404, 'Compliance feature data not found or unauthorized');
  }

  await ReportService.generateFeatureReport(featureId, organizationId, res);
});

export const getAlerts = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');

  const alerts = await ComplianceService.getAlerts(organizationId);
  return sendSuccess(res, alerts);
});

export const postMarkAlertRead = asyncHandler(async (req: any, res: Response) => {
  const { alertId } = req.body;
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');

  const alert = await prisma.alerts.findFirst({
    where: { id: alertId, organizationId }
  });
  if (!alert) {
    return sendError(res, 404, 'Alert not found or unauthorized');
  }

  await ComplianceService.markAlertRead(alertId);
  return sendSuccess(res, undefined);
});

export const getAuditLogs = asyncHandler(async (req: any, res: Response) => {
  const { featureId } = req.query;
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');

  const logs = await ComplianceService.getAuditLogs(organizationId, featureId as string);
  return sendSuccess(res, logs);
});

export const getComplianceStats = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');

  const violations = await prisma.incidents.findMany({
    where: { organizationId },
    select: { created_at: true, details: true }
  });

  const breakdown = { GDPR: 0, HIPAA: 0, DPDP: 0 };
  violations.forEach((v: any) => {
    const d = String(v.details || '').toUpperCase();
    if (d.includes('GDPR')) breakdown.GDPR++;
    if (d.includes('HIPAA')) breakdown.HIPAA++;
    if (d.includes('DPDP')) breakdown.DPDP++;
  });

  // Query PII action logs with PostgreSQL JSON path filtering and SQLite fallback
  let piiLogs: any[] = [];
  try {
    piiLogs = await prisma.logs.findMany({
      where: {
        organizationId,
        metadata: {
          path: ['piiDetected'],
          equals: true,
        },
      },
    });
    // Fall back if query returns 0 results unexpectedly
    if (piiLogs.length === 0) {
      throw new Error('Zero results unexpectedly from JSON path query');
    }
  } catch (err) {
    // SQLite dev fallback: query active organization's logs and filter in-memory
    const allLogs = await prisma.logs.findMany({
      where: { organizationId },
      orderBy: { timestamp: 'desc' },
    });
    piiLogs = allLogs.filter((log: any) => {
      const meta = log.metadata ? (typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata) : null;
      return meta && meta.piiDetected === true;
    });
  }

  const piiBreakdown = { GDPR: 0, HIPAA: 0, DPDP: 0 };
  piiLogs.forEach((log: any) => {
    const meta = log.metadata ? (typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata) : null;
    if (meta && Array.isArray(meta.violatedFrameworks)) {
      meta.violatedFrameworks.forEach((fw: string) => {
        const upperFw = fw.toUpperCase();
        if (upperFw === 'GDPR') piiBreakdown.GDPR++;
        if (upperFw === 'HIPAA') piiBreakdown.HIPAA++;
        if (upperFw === 'DPDP') piiBreakdown.DPDP++;
      });
    }
  });

  const last7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentViolations = await prisma.incidents.findMany({
    where: { organizationId, created_at: { gte: last7 } },
    select: { created_at: true },
    orderBy: { created_at: 'asc' }
  });

  const trendMap: Record<string, number> = {};
  recentViolations.forEach((v: any) => {
    const date = v.created_at.toISOString().split('T')[0];
    trendMap[date] = (trendMap[date] || 0) + 1;
  });

  const riskTrends = Object.entries(trendMap).map(([date, risk]) => ({ date, risk }));

  const euAiActOverview = await EuAiActService.getFrameworkOverview(organizationId);
  const euAiActScore = euAiActOverview.summary.compliance_score;

  return sendSuccess(res, {
    totalViolations: violations.length + piiLogs.length,
    breakdown: { GDPR: breakdown.GDPR, HIPAA: breakdown.HIPAA, DPDP: breakdown.DPDP },
    piiViolations: piiBreakdown,
    riskTrends,
    frameworks: [
      { name: 'EU AI Act', score: euAiActScore, controls: euAiActOverview.summary }
    ]
  });
});

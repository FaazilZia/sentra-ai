import { Response } from 'express';
import { ComplianceService } from '../services/compliance.service';
import { ReportService } from '../services/report.service';
import { EuAiActService } from '../services/euAiAct.service';
import { resolveOrganizationId } from '../utils/company';
import logger from '../utils/logger';
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
  const tasks = await ComplianceService.getFixTasks(featureId);
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
  const history = await ComplianceService.getHistory(featureId);
  return sendSuccess(res, history);
});

export const getExportReport = asyncHandler(async (req: any, res: Response) => {
  const { featureId } = req.params;
  await ReportService.generateFeatureReport(featureId, res);
});

export const getAlerts = asyncHandler(async (req: any, res: Response) => {
  const alerts = await ComplianceService.getAlerts();
  return sendSuccess(res, alerts);
});

export const postMarkAlertRead = asyncHandler(async (req: any, res: Response) => {
  const { alertId } = req.body;
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
    totalViolations: violations.length,
    breakdown: { GDPR: breakdown.GDPR, HIPAA: breakdown.HIPAA, DPDP: breakdown.DPDP },
    riskTrends,
    frameworks: [
      { name: 'EU AI Act', score: euAiActScore, controls: euAiActOverview.summary }
    ]
  });
});

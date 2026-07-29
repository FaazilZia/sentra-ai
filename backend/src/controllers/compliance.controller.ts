import { Response } from 'express';
import { ComplianceService } from '../services/compliance.service';
import { ReportService } from '../services/report.service';
import { resolveOrganizationId } from '../utils/company';
import prisma from '../config/db';
import { asyncHandler, sendSuccess, sendError } from '../utils/controllerHelpers';
import { SUPPORTED_FRAMEWORKS, SupportedFramework } from '../constants/frameworks';

// Import 5 supported framework service classes
import { GdprService } from '../services/gdpr.service';
import { HipaaService } from '../services/hipaa.service';
import { DpdpService } from '../services/dpdp.service';
import { NistAiRmfService } from '../services/nistAiRmf.service';
import { PciService } from '../services/pci.service';

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
    if (piiLogs.length === 0) {
      throw new Error('Zero results unexpectedly from JSON path query');
    }
  } catch (err) {
    const allLogs = await prisma.logs.findMany({
      where: { organizationId },
      orderBy: { timestamp: 'desc' },
    });
    piiLogs = allLogs.filter((log: any) => {
      const meta = log.metadata ? (typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata) : null;
      return meta && meta.piiDetected === true;
    });
  }

  const frameworkKeys = ['GDPR', 'DPDP', 'HIPAA', 'PCI_DSS', 'NIST_AI_RMF'];

  const breakdown: Record<string, number> = {};
  const piiBreakdown: Record<string, number> = {};
  frameworkKeys.forEach(k => {
    breakdown[k] = 0;
    piiBreakdown[k] = 0;
  });

  violations.forEach((v: any) => {
    const d = String(v.details || '').toUpperCase();
    frameworkKeys.forEach(k => {
      if (d.includes(k)) breakdown[k]++;
    });
  });

  piiLogs.forEach((log: any) => {
    const meta = log.metadata ? (typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata) : null;
    if (meta && Array.isArray(meta.violatedFrameworks)) {
      meta.violatedFrameworks.forEach((fw: string) => {
        const upperFw = fw.toUpperCase();
        frameworkKeys.forEach(k => {
          if (upperFw.includes(k)) piiBreakdown[k]++;
        });
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

  const [
    gdprStats,
    hipaaStats,
    dpdpStats,
    nistAiRmfOverview,
    pciStats,
  ] = await Promise.all([
    GdprService.getStats(organizationId).catch(() => null),
    HipaaService.getStats(organizationId).catch(() => null),
    DpdpService.getStats(organizationId).catch(() => null),
    NistAiRmfService.getFrameworkOverview(organizationId).catch(() => null),
    PciService.getStats(organizationId).catch(() => null),
  ]);

  const frameworkList = [
    {
      name: 'GDPR',
      score: gdprStats?.compliance_score ?? 100,
      controls: {
        total_controls: gdprStats?.total_controls ?? 0,
        implemented: gdprStats?.implemented ?? 0,
        in_progress: gdprStats?.in_progress ?? 0,
        not_started: gdprStats?.not_started ?? 0,
        not_applicable: gdprStats?.not_applicable ?? 0
      }
    },
    {
      name: 'DPDP',
      score: dpdpStats?.compliance_score ?? 100,
      controls: {
        total_controls: dpdpStats?.total_controls ?? 0,
        implemented: dpdpStats?.implemented ?? 0,
        in_progress: dpdpStats?.in_progress ?? 0,
        not_started: dpdpStats?.not_started ?? 0,
        not_applicable: dpdpStats?.not_applicable ?? 0
      }
    },
    {
      name: 'HIPAA',
      score: hipaaStats?.compliance_score ?? 100,
      controls: {
        total_controls: hipaaStats?.total_controls ?? 0,
        implemented: hipaaStats?.implemented ?? 0,
        in_progress: hipaaStats?.in_progress ?? 0,
        not_started: hipaaStats?.not_started ?? 0,
        not_applicable: hipaaStats?.not_applicable ?? 0
      }
    },
    {
      name: 'PCI_DSS',
      score: pciStats?.compliance_score ?? 100,
      controls: {
        total_controls: pciStats?.total_controls ?? 0,
        implemented: pciStats?.implemented ?? 0,
        in_progress: pciStats?.in_progress ?? 0,
        not_started: pciStats?.not_started ?? 0,
        not_applicable: pciStats?.not_applicable ?? 0
      }
    },
    {
      name: 'NIST_AI_RMF',
      score: nistAiRmfOverview?.score ?? 100,
      controls: {
        total_controls: nistAiRmfOverview?.summary?.total_subcategories ?? 0,
        implemented: nistAiRmfOverview?.summary?.implemented ?? 0,
        in_progress: nistAiRmfOverview?.summary?.in_progress ?? 0,
        not_started: nistAiRmfOverview?.summary?.not_started ?? 0,
        not_applicable: nistAiRmfOverview?.summary?.not_applicable ?? 0
      }
    },
  ];

  return sendSuccess(res, {
    totalViolations: violations.length + piiLogs.length,
    breakdown,
    piiViolations: piiBreakdown,
    riskTrends,
    frameworks: frameworkList
  });
});

/**
 * Unified Per-Framework View: Aggregates static AISPM posture findings and live AIDR runtime blocks.
 */
export const getUnifiedFrameworkView = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');

  const { framework } = req.params;
  const targetFw = String(framework).toUpperCase().replace('-', '_');

  if (!SUPPORTED_FRAMEWORKS.includes(targetFw as SupportedFramework)) {
    return sendError(res, 400, `Unsupported framework '${framework}'. Must be one of: ${SUPPORTED_FRAMEWORKS.join(', ')}`);
  }

  // Fetch AISPM static posture findings for this framework
  const postureFindings = await prisma.agent_posture_findings.findMany({
    where: { organizationId, framework: targetFw },
    include: { agent: { select: { id: true, name: true, type: true } } },
    orderBy: { createdAt: 'desc' },
  });

  // Fetch AIDR runtime block events for this framework
  const runtimeBlocks = await prisma.blockEvent.findMany({
    where: { organizationId, frameworks: { has: targetFw } },
    orderBy: { timestamp: 'desc' },
    take: 100,
  });

  return sendSuccess(res, {
    framework: targetFw,
    aispmPostureFindingsCount: postureFindings.length,
    aidrRuntimeBlocksCount: runtimeBlocks.length,
    postureFindings,
    runtimeBlocks,
  });
});

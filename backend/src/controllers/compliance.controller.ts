import { Response } from 'express';
import { ComplianceService } from '../services/compliance.service';
import { ReportService } from '../services/report.service';
import { resolveOrganizationId } from '../utils/company';
import prisma from '../config/db';
import { asyncHandler, sendSuccess, sendError } from '../utils/controllerHelpers';

// Import all 13 framework service classes
import { GdprService } from '../services/gdpr.service';
import { CcpaService } from '../services/ccpa.service';
import { HipaaService } from '../services/hipaa.service';
import { DpdpService } from '../services/dpdp.service';
import { EuAiActService } from '../services/euAiAct.service';
import { NistAiRmfService } from '../services/nistAiRmf.service';
import { Iso42001Service } from '../services/iso42001.service';
import { Iso27001Service } from '../services/iso27001.service';
import { Soc2Service } from '../services/soc2.service';
import { PciService } from '../services/pci.service';
import { DoraService } from '../services/dora.service';
import { OecdService } from '../services/oecd.service';
import { FtcService } from '../services/ftc.service';

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

  const frameworkKeys = [
    'GDPR', 'CCPA', 'HIPAA', 'DPDP', 'EU AI Act', 'NIST AI RMF', 'ISO 42001', 'ISO 27001', 'SOC2', 'PCI-DSS', 'DORA', 'OECD', 'FTC'
  ];

  const breakdown: Record<string, number> = {};
  const piiBreakdown: Record<string, number> = {};
  frameworkKeys.forEach(k => {
    breakdown[k] = 0;
    piiBreakdown[k] = 0;
  });

  // Count incidents violations
  violations.forEach((v: any) => {
    const d = String(v.details || '').toUpperCase();
    frameworkKeys.forEach(k => {
      const keyUpper = k.toUpperCase();
      if (d.includes(keyUpper) || 
          (keyUpper === 'EU AI ACT' && (d.includes('EU-AIA') || d.includes('EU AI'))) ||
          (keyUpper === 'NIST AI RMF' && (d.includes('NIST') || d.includes('NIST-AI'))) ||
          (keyUpper === 'ISO 42001' && d.includes('ISO-42001')) ||
          (keyUpper === 'ISO 27001' && d.includes('ISO-27001')) ||
          (keyUpper === 'PCI-DSS' && (d.includes('PCI') || d.includes('PCI-DSS')))) {
        breakdown[k]++;
      }
    });
  });

  // Count PII violations
  piiLogs.forEach((log: any) => {
    const meta = log.metadata ? (typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata) : null;
    if (meta && Array.isArray(meta.violatedFrameworks)) {
      meta.violatedFrameworks.forEach((fw: string) => {
        const upperFw = fw.toUpperCase();
        frameworkKeys.forEach(k => {
          const keyUpper = k.toUpperCase();
          if (upperFw === keyUpper || 
              (keyUpper === 'EU AI ACT' && (upperFw.includes('EU-AIA') || upperFw.includes('EU AI'))) ||
              (keyUpper === 'NIST AI RMF' && (upperFw.includes('NIST') || upperFw.includes('NIST-AI'))) ||
              (keyUpper === 'ISO 42001' && upperFw.includes('ISO-42001')) ||
              (keyUpper === 'ISO 27001' && upperFw.includes('ISO-27001')) ||
              (keyUpper === 'PCI-DSS' && (upperFw.includes('PCI') || upperFw.includes('PCI-DSS')))) {
            piiBreakdown[k]++;
          }
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

  // Parallel fetch for all framework stats
  const [
    gdprStats,
    ccpaOverview,
    hipaaStats,
    dpdpStats,
    euAiActOverview,
    nistAiRmfOverview,
    iso42001Overview,
    iso27001Overview,
    soc2Stats,
    pciStats,
    doraOverview,
    oecdOverview,
    ftcOverview
  ] = await Promise.all([
    GdprService.getStats(organizationId).catch(() => null),
    CcpaService.getFrameworkOverview(organizationId).catch(() => null),
    HipaaService.getStats(organizationId).catch(() => null),
    DpdpService.getStats(organizationId).catch(() => null),
    EuAiActService.getFrameworkOverview(organizationId).catch(() => null),
    NistAiRmfService.getFrameworkOverview(organizationId).catch(() => null),
    Iso42001Service.getFrameworkOverview(organizationId).catch(() => null),
    Iso27001Service.getFrameworkOverview(organizationId).catch(() => null),
    Soc2Service.getStats(organizationId).catch(() => null),
    PciService.getStats(organizationId).catch(() => null),
    DoraService.getFrameworkOverview(organizationId).catch(() => null),
    OecdService.getFrameworkOverview(organizationId).catch(() => null),
    FtcService.getFrameworkOverview(organizationId).catch(() => null),
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
      name: 'CCPA',
      score: ccpaOverview?.summary?.compliance_score ?? 0,
      controls: {
        total_controls: ccpaOverview?.summary?.total_controls ?? 0,
        implemented: ccpaOverview?.summary?.implemented ?? 0,
        in_progress: ccpaOverview?.summary?.in_progress ?? 0,
        not_started: ccpaOverview?.summary?.not_started ?? 0,
        not_applicable: ccpaOverview?.summary?.not_applicable ?? 0
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
      name: 'EU AI Act',
      score: euAiActOverview?.summary?.compliance_score ?? 0,
      controls: {
        total_controls: euAiActOverview?.summary?.total_controls ?? 0,
        implemented: euAiActOverview?.summary?.implemented ?? 0,
        in_progress: euAiActOverview?.summary?.in_progress ?? 0,
        not_started: euAiActOverview?.summary?.not_started ?? 0,
        not_applicable: euAiActOverview?.summary?.not_applicable ?? 0
      }
    },
    {
      name: 'NIST AI RMF',
      score: nistAiRmfOverview?.score ?? 0,
      controls: {
        total_controls: nistAiRmfOverview?.summary?.total_subcategories ?? 0,
        implemented: nistAiRmfOverview?.summary?.implemented ?? 0,
        in_progress: nistAiRmfOverview?.summary?.in_progress ?? 0,
        not_started: nistAiRmfOverview?.summary?.not_started ?? 0,
        not_applicable: nistAiRmfOverview?.summary?.not_applicable ?? 0
      }
    },
    {
      name: 'ISO 42001',
      score: iso42001Overview?.summary?.compliance_score ?? 0,
      controls: {
        total_controls: iso42001Overview?.summary?.total_controls ?? 0,
        implemented: iso42001Overview?.summary?.implemented ?? 0,
        in_progress: iso42001Overview?.summary?.in_progress ?? 0,
        not_started: iso42001Overview?.summary?.not_started ?? 0,
        not_applicable: iso42001Overview?.summary?.not_applicable ?? 0
      }
    },
    {
      name: 'ISO 27001',
      score: iso27001Overview?.summary?.compliance_score ?? 0,
      controls: {
        total_controls: iso27001Overview?.summary?.total_controls ?? 0,
        implemented: iso27001Overview?.summary?.implemented ?? 0,
        in_progress: iso27001Overview?.summary?.in_progress ?? 0,
        not_started: iso27001Overview?.summary?.not_started ?? 0,
        not_applicable: iso27001Overview?.summary?.not_applicable ?? 0
      }
    },
    {
      name: 'SOC2',
      score: soc2Stats?.compliance_score ?? 100,
      controls: {
        total_controls: soc2Stats?.total_controls ?? 0,
        implemented: soc2Stats?.implemented ?? 0,
        in_progress: soc2Stats?.in_progress ?? 0,
        not_started: soc2Stats?.not_started ?? 0,
        not_applicable: soc2Stats?.not_applicable ?? 0
      }
    },
    {
      name: 'PCI-DSS',
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
      name: 'DORA',
      score: doraOverview?.summary?.compliance_score ?? 0,
      controls: {
        total_controls: doraOverview?.summary?.total_controls ?? 0,
        implemented: doraOverview?.summary?.implemented ?? 0,
        in_progress: doraOverview?.summary?.in_progress ?? 0,
        not_started: doraOverview?.summary?.not_started ?? 0,
        not_applicable: doraOverview?.summary?.not_applicable ?? 0
      }
    },
    {
      name: 'OECD',
      score: oecdOverview?.summary?.compliance_score ?? 0,
      controls: {
        total_controls: oecdOverview?.summary?.total_controls ?? 0,
        implemented: oecdOverview?.summary?.implemented ?? 0,
        in_progress: oecdOverview?.summary?.in_progress ?? 0,
        not_started: oecdOverview?.summary?.not_started ?? 0,
        not_applicable: oecdOverview?.summary?.not_applicable ?? 0
      }
    },
    {
      name: 'FTC',
      score: ftcOverview?.summary?.compliance_score ?? 0,
      controls: {
        total_controls: ftcOverview?.summary?.total_controls ?? 0,
        implemented: ftcOverview?.summary?.implemented ?? 0,
        in_progress: ftcOverview?.summary?.in_progress ?? 0,
        not_started: ftcOverview?.summary?.not_started ?? 0,
        not_applicable: ftcOverview?.summary?.not_applicable ?? 0
      }
    }
  ];

  return sendSuccess(res, {
    totalViolations: violations.length + piiLogs.length,
    breakdown,
    piiViolations: piiBreakdown,
    riskTrends,
    frameworks: frameworkList
  });
});

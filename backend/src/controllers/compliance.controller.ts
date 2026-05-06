import { Response, NextFunction } from 'express';
import { ComplianceService } from '../services/compliance.service';
import { ReportService } from '../services/report.service';
import { resolveOrganizationId } from '../utils/company';
import logger from '../utils/logger';

import prisma from '../config/db';

export const getAuditProof = async (req: any, res: Response, next: NextFunction) => {
  try {
    const organizationId = await resolveOrganizationId(req);
    if (!organizationId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const proof = await ComplianceService.getAuditProof(organizationId);
    
    res.status(200).json({
      success: true,
      data: proof
    });
  } catch (error) {
    logger.error('Error fetching audit proof:', error);
    next(error);
  }
};

export const postFixTasks = async (req: any, res: Response, next: NextFunction) => {
  try {
    const organizationId = await resolveOrganizationId(req);
    if (!organizationId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { featureId, actionPlan } = req.body;
    const tasks = await ComplianceService.createFixTasks(featureId, actionPlan);
    
    // Log audit
    await ComplianceService.logAudit(req.user.id, organizationId, 'CREATE_FIX_TASKS', featureId, { count: tasks.length });

    res.status(201).json({ success: true, data: tasks });
  } catch (error) {
    next(error);
  }
};

export const getFixTasks = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { featureId } = req.params;
    const tasks = await ComplianceService.getFixTasks(featureId);
    res.status(200).json({ success: true, data: tasks });
  } catch (error) {
    next(error);
  }
};

export const postEvidence = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { taskId, type, value, source_type } = req.body;
    const organizationId = await resolveOrganizationId(req);
    if (!organizationId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const evidence = await ComplianceService.addEvidence(taskId, { type, value, source_type }, req.user.id, organizationId);
    res.status(201).json({ success: true, data: evidence });
  } catch (error) {
    next(error);
  }
};

export const postReEvaluate = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { featureId } = req.body;
    if (!featureId) {
      return res.status(400).json({ success: false, message: 'featureId is required in request body' });
    }
    const organizationId = await resolveOrganizationId(req);
    if (!organizationId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const result = await ComplianceService.reEvaluate(featureId, req.user.id, organizationId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
export const getHistory = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { featureId } = req.params;
    const history = await ComplianceService.getHistory(featureId);
    res.status(200).json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
};
export const getExportReport = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { featureId } = req.params;
    await ReportService.generateFeatureReport(featureId, res);
  } catch (error) {
    next(error);
  }
};

export const getAlerts = async (req: any, res: Response, next: NextFunction) => {
  try {
    const alerts = await ComplianceService.getAlerts();
    res.status(200).json({ success: true, data: alerts });
  } catch (error) {
    next(error);
  }
};

export const postMarkAlertRead = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { alertId } = req.body;
    await ComplianceService.markAlertRead(alertId);
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const getAuditLogs = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { featureId } = req.query;
    const organizationId = await resolveOrganizationId(req);
    if (!organizationId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const logs = await ComplianceService.getAuditLogs(organizationId, featureId as string);
    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
};
export const getComplianceStats = async (req: any, res: Response, next: NextFunction) => {
  try {
    const organizationId = await resolveOrganizationId(req);
    if (!organizationId) return res.status(401).json({ success: false, message: 'Unauthorized' });

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

    res.status(200).json({
      success: true,
      data: {
        totalViolations: violations.length,
        breakdown,
        riskTrends
      }
    });
  } catch (error) {
    next(error);
  }
};

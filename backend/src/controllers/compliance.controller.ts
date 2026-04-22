import { Response, NextFunction } from 'express';
import { ComplianceService } from '../services/compliance.service';
import { ReportService } from '../services/report.service';
import logger from '../utils/logger';

export const getAuditProof = async (req: any, res: Response, next: NextFunction) => {
  try {
    const proof = await ComplianceService.getAuditProof();
    
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
    const { featureId, actionPlan } = req.body;
    const tasks = await ComplianceService.createFixTasks(featureId, actionPlan);
    
    // Log audit
    await ComplianceService.logAudit(req.user.id, req.user.organizationId, 'CREATE_FIX_TASKS', featureId, { count: tasks.length });

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
    const organizationId = req.user.organizationId;
    const evidence = await ComplianceService.addEvidence(taskId, { type, value, source_type }, req.user.id, organizationId);
    res.status(201).json({ success: true, data: evidence });
  } catch (error) {
    next(error);
  }
};

export const postReEvaluate = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { featureId } = req.body;
    const organizationId = req.user.organizationId;
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
    const organizationId = req.user.organizationId;
    const logs = await ComplianceService.getAuditLogs(organizationId, featureId as string);
    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
};

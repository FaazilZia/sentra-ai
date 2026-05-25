import { Response } from 'express';
import { PostMarketMonitoringService } from '../services/postMarketMonitoring.service';
import { asyncHandler, sendSuccess, sendError, getOrgId } from '../utils/controllerHelpers';

export const getDashboard = asyncHandler(async (req: any, res: Response) => {
  const organizationId = getOrgId(req);
  try {
    const dashboard = await PostMarketMonitoringService.getMonitoringDashboard(organizationId);
    return sendSuccess(res, dashboard);
  } catch (err: any) {
    return sendError(res, 500, err.message);
  }
});

export const generateReport = asyncHandler(async (req: any, res: Response) => {
  const organizationId = getOrgId(req);
  try {
    const report = await PostMarketMonitoringService.generateMonitoringReport(organizationId);
    return sendSuccess(res, report);
  } catch (err: any) {
    return sendError(res, 500, err.message);
  }
});

export const scheduleCheck = asyncHandler(async (req: any, res: Response) => {
  const organizationId = getOrgId(req);
  try {
    await PostMarketMonitoringService.scheduleMonitoringCheck(organizationId);
    return sendSuccess(res, { message: 'Monitoring checks scheduled successfully' });
  } catch (err: any) {
    return sendError(res, 500, err.message);
  }
});

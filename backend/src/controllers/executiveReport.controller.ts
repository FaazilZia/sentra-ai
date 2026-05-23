import { Response } from 'express';
import { ExecutiveReportService } from '../services/executiveReport.service';
import { resolveOrganizationId } from '../utils/company';
import { asyncHandler, sendSuccess, sendError } from '../utils/controllerHelpers';

export const getExecutiveStats = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) {
    return sendError(res, 400, 'Company context required');
  }

  const stats = await ExecutiveReportService.getStats(organizationId);
  return sendSuccess(res, stats);
});

export const getExecutivePdf = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) {
    return sendError(res, 400, 'Company context required');
  }

  try {
    await ExecutiveReportService.generatePdf(organizationId, res);
  } catch (error: any) {
    console.error('Failed to generate executive report PDF:', error);
    if (!res.headersSent) {
      return sendError(res, 500, 'Failed to generate report PDF');
    }
  }
});

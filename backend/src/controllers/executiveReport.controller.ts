import { Response } from 'express';
import { ExecutiveReportService } from '../services/executiveReport.service';
import { ReportGenerationService } from '../services/reportGeneration.service';
import { resolveOrganizationId } from '../utils/company';
import { asyncHandler, sendSuccess, sendError } from '../utils/controllerHelpers';
import logger from '../utils/logger';

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
    await ReportGenerationService.generateComplianceReportPDF(organizationId, res);
  } catch (error: any) {
    logger.error('Failed to generate compliance report PDF:', error);
    if (!res.headersSent) {
      return sendError(res, 500, 'Failed to generate report PDF');
    }
  }
});

export const getExecutiveDocx = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) {
    return sendError(res, 400, 'Company context required');
  }

  try {
    await ReportGenerationService.generateComplianceReportDOCX(organizationId, res);
  } catch (error: any) {
    logger.error('Failed to generate compliance report DOCX:', error);
    if (!res.headersSent) {
      return sendError(res, 500, 'Failed to generate report DOCX');
    }
  }
});

export const getPolicyPdf = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) {
    return sendError(res, 400, 'Company context required');
  }

  const { policyId } = req.params;
  try {
    await ReportGenerationService.generatePolicyExportPDF(organizationId, policyId, res);
  } catch (error: any) {
    logger.error('Failed to generate policy PDF:', error);
    if (!res.headersSent) {
      return sendError(res, 500, 'Failed to generate policy PDF');
    }
  }
});

export const getPolicyDocx = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) {
    return sendError(res, 400, 'Company context required');
  }

  const { policyId } = req.params;
  try {
    await ReportGenerationService.generatePolicyExportDOCX(organizationId, policyId, res);
  } catch (error: any) {
    logger.error('Failed to generate policy DOCX:', error);
    if (!res.headersSent) {
      return sendError(res, 500, 'Failed to generate policy DOCX');
    }
  }
});

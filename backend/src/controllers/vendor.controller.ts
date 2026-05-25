import { Response } from 'express';
import { VendorService } from '../services/vendor.service';
import { asyncHandler, sendSuccess, sendError, getOrgId } from '../utils/controllerHelpers';

export const listVendors = asyncHandler(async (req: any, res: Response) => {
  const organizationId = getOrgId(req);
  const vendors = await VendorService.listVendors(organizationId);
  return sendSuccess(res, vendors);
});

export const createVendor = asyncHandler(async (req: any, res: Response) => {
  const { vendor_name, vendor_type, risk_score, risk_level, data_access, compliance_frameworks, assessment_notes } = req.body;
  if (!vendor_name || !vendor_type || risk_score === undefined || !risk_level) {
    return sendError(res, 400, 'vendor_name, vendor_type, risk_score, and risk_level are required');
  }
  const organizationId = getOrgId(req);
  const vendor = await VendorService.createVendor(organizationId, {
    vendor_name,
    vendor_type,
    risk_score,
    risk_level,
    data_access: data_access || [],
    compliance_frameworks: compliance_frameworks || [],
    assessment_notes: assessment_notes || '',
  });
  return sendSuccess(res, vendor, 201);
});

export const updateVendor = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const organizationId = getOrgId(req);
  try {
    const updated = await VendorService.updateVendor(organizationId, id, req.body);
    return sendSuccess(res, updated);
  } catch (err: any) {
    return sendError(res, 404, err.message);
  }
});

export const deleteVendor = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const organizationId = getOrgId(req);
  try {
    const deleted = await VendorService.deleteVendor(organizationId, id);
    return sendSuccess(res, deleted);
  } catch (err: any) {
    return sendError(res, 404, err.message);
  }
});

export const reviewVendor = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status) {
    return sendError(res, 400, 'status is required');
  }
  const organizationId = getOrgId(req);
  const reviewerName = req.user.full_name || req.user.email || 'Admin';
  try {
    const updated = await VendorService.reviewVendor(organizationId, id, status, reviewerName);
    return sendSuccess(res, updated);
  } catch (err: any) {
    return sendError(res, 404, err.message);
  }
});

export const getRiskSummary = asyncHandler(async (req: any, res: Response) => {
  const organizationId = getOrgId(req);
  const summary = await VendorService.getRiskSummary(organizationId);
  return sendSuccess(res, summary);
});

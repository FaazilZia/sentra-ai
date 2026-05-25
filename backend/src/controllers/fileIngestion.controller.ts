import { Response } from 'express';
import { FileIngestionService } from '../services/fileIngestion.service';
import { asyncHandler, sendSuccess, sendError, getOrgId } from '../utils/controllerHelpers';

export const uploadEvidenceFile = asyncHandler(async (req: any, res: Response) => {
  const { controlType, controlId } = req.body;
  const file = req.file;

  if (!controlType || !controlId) {
    return sendError(res, 400, 'controlType and controlId are required');
  }
  if (!file) {
    return sendError(res, 400, 'file upload field "file" is required');
  }

  const organizationId = getOrgId(req);
  try {
    const record = await FileIngestionService.uploadEvidenceFile(
      organizationId,
      controlType,
      controlId,
      file,
      req.user.id
    );
    return sendSuccess(res, record, 201);
  } catch (err: any) {
    return sendError(res, 400, err.message);
  }
});

export const listEvidenceFiles = asyncHandler(async (req: any, res: Response) => {
  const { controlType, controlId } = req.params;
  const organizationId = getOrgId(req);
  try {
    const files = await FileIngestionService.listEvidenceFiles(organizationId, controlType, controlId);
    return sendSuccess(res, files);
  } catch (err: any) {
    return sendError(res, 400, err.message);
  }
});

export const deleteEvidenceFile = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const organizationId = getOrgId(req);
  try {
    const deleted = await FileIngestionService.deleteEvidenceFile(id, organizationId);
    return sendSuccess(res, deleted);
  } catch (err: any) {
    return sendError(res, 404, err.message);
  }
});

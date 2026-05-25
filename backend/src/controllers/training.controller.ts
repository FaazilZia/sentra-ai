import { Response } from 'express';
import { TrainingService } from '../services/training.service';
import { getOrgId, asyncHandler, sendSuccess, sendError } from '../utils/controllerHelpers';
import prisma from '../config/db';

export const listCourses = asyncHandler(async (req: any, res: Response) => {
  const orgId = getOrgId(req);
  const courses = await TrainingService.listCourses(orgId);
  return sendSuccess(res, courses);
});

export const createCourse = asyncHandler(async (req: any, res: Response) => {
  const orgId = getOrgId(req);
  const data = req.body;
  const course = await TrainingService.createCourse(orgId, data);
  return sendSuccess(res, course, 201, 'Course created successfully');
});

export const updateCourse = asyncHandler(async (req: any, res: Response) => {
  const orgId = getOrgId(req);
  const { id } = req.params;
  const data = req.body;
  const course = await TrainingService.updateCourse(orgId, id, data);
  return sendSuccess(res, course, 200, 'Course updated successfully');
});

export const deleteCourse = asyncHandler(async (req: any, res: Response) => {
  const orgId = getOrgId(req);
  const { id } = req.params;
  await TrainingService.deleteCourse(orgId, id);
  return sendSuccess(res, null, 200, 'Course deleted successfully');
});

export const recordCompletion = asyncHandler(async (req: any, res: Response) => {
  const orgId = getOrgId(req);
  const { id } = req.params;
  const { userId, score, notes } = req.body;

  if (!userId) {
    return sendError(res, 400, 'User ID required');
  }

  const completion = await TrainingService.recordCompletion(orgId, id, userId, score, notes);
  return sendSuccess(res, completion, 201, 'Completion recorded successfully');
});

export const getCompletionStatus = asyncHandler(async (req: any, res: Response) => {
  const orgId = getOrgId(req);
  const status = await TrainingService.getCompletionStatus(orgId);
  
  // Also fetch dynamic gap parameters
  const gaps = await TrainingService.getMandatoryComplianceGap(orgId);
  const users = await prisma.users.findMany({
    where: { organizationId: orgId, is_active: true },
    select: { id: true, full_name: true, email: true }
  });

  return sendSuccess(res, { status, gaps, users });
});

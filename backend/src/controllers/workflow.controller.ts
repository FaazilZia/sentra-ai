import { Response } from 'express';
import { WorkflowService } from '../services/workflow.service';
import { parsePagination } from '../utils/pagination';
import { asyncHandler, sendSuccess, sendError, getOrgId } from '../utils/controllerHelpers';

export const createTask = asyncHandler(async (req: any, res: Response) => {
  const task = await WorkflowService.createTask({
    organizationId: getOrgId(req),
    createdBy: req.user.id,
    ...req.body,
  });
  return sendSuccess(res, task, 201);
});

export const listTasks = asyncHandler(async (req: any, res: Response) => {
  const { page, limit } = parsePagination(req.query, 20, 200);
  const result = await WorkflowService.listTasks(getOrgId(req), {
    state: req.query.state as string,
    category: req.query.category as string,
    assignedTo: req.query.assignedTo as string,
    page,
    limit,
  });
  return sendSuccess(res, result);
});

export const getTask = asyncHandler(async (req: any, res: Response) => {
  const task = await WorkflowService.getTask(req.params.id, getOrgId(req));
  if (!task) return sendError(res, 404, 'Task not found');
  return sendSuccess(res, task);
});

export const submitForReview = asyncHandler(async (req: any, res: Response) => {
  const orgId = getOrgId(req);
  try {
    const result = await WorkflowService.submitForReview(
      req.params.id, orgId, req.user.id, req.user.role, req.body.comment
    );
    return sendSuccess(res, result);
  } catch (e: any) {
    if (e.message?.includes('Invalid transition') || e.message?.includes('Role')) {
      return sendError(res, 400, e.message);
    }
    throw e;
  }
});

const handleWorkflowTransition = async (
  req: any,
  res: Response,
  actionFn: (args: any) => Promise<any>
) => {
  const orgId = getOrgId(req);
  try {
    const result = await actionFn({
      taskId: req.params.id,
      organizationId: orgId,
      reviewerId: req.user.id,
      reviewerRole: req.user.role,
      comment: req.body.comment,
    });
    return sendSuccess(res, result);
  } catch (e: any) {
    if (e.message?.includes('transition') || e.message?.includes('Role')) {
      return sendError(res, 400, e.message);
    }
    throw e;
  }
};

export const approveTask = asyncHandler(async (req: any, res: Response) => {
  return await handleWorkflowTransition(req, res, WorkflowService.approveTask);
});

export const rejectTask = asyncHandler(async (req: any, res: Response) => {
  if (!req.body.comment) return sendError(res, 400, 'Rejection comment required');
  return await handleWorkflowTransition(req, res, WorkflowService.rejectTask);
});

export const assignTask = asyncHandler(async (req: any, res: Response) => {
  await WorkflowService.assignTask(req.params.id, getOrgId(req), req.body.assignedTo, req.user.id);
  return sendSuccess(res, undefined, 200, 'Task assigned');
});

export const getTaskHistory = asyncHandler(async (req: any, res: Response) => {
  const orgId = getOrgId(req);
  try {
    const history = await WorkflowService.getStateHistory(req.params.id, orgId);
    return sendSuccess(res, history);
  } catch (e: any) {
    if (e.message === 'Task not found') return sendError(res, 404, e.message);
    throw e;
  }
});

export const listPendingWorkflows = asyncHandler(async (req: any, res: Response) => {
  const orgId = getOrgId(req);
  const tasks = await WorkflowService.listPendingTasks(orgId);
  return sendSuccess(res, { items: tasks });
});

export const resolveWorkflow = asyncHandler(async (req: any, res: Response) => {
  const orgId = getOrgId(req);
  const { id } = req.params;
  const { decision, comment } = req.body;

  if (!decision || !['APPROVED', 'REJECTED'].includes(decision)) {
    return sendError(res, 400, 'Decision must be either APPROVED or REJECTED');
  }

  try {
    const result = await WorkflowService.resolveTask(
      id,
      orgId,
      decision,
      req.user.id,
      req.user.role,
      comment
    );
    return sendSuccess(res, result);
  } catch (e: any) {
    if (e.message?.includes('not found')) {
      return sendError(res, 404, e.message);
    }
    return sendError(res, 400, e.message);
  }
});


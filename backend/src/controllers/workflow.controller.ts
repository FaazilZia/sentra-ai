import { Response, NextFunction } from 'express';
import { WorkflowService, WorkflowState } from '../services/workflow.service';

export const createTask = async (req: any, res: Response, next: NextFunction) => {
  try {
    const task = await WorkflowService.createTask({
      organizationId: req.user.organizationId,
      createdBy: req.user.id,
      ...req.body,
    });
    res.status(201).json({ success: true, data: task });
  } catch (e) { next(e); }
};

export const listTasks = async (req: any, res: Response, next: NextFunction) => {
  try {
    const result = await WorkflowService.listTasks(req.user.organizationId, {
      state: req.query.state as string,
      category: req.query.category as string,
      assignedTo: req.query.assignedTo as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
    });
    res.json({ success: true, ...result });
  } catch (e) { next(e); }
};

export const getTask = async (req: any, res: Response, next: NextFunction) => {
  try {
    const task = await WorkflowService.getTask(req.params.id, req.user.organizationId);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, data: task });
  } catch (e) { next(e); }
};

export const submitForReview = async (req: any, res: Response, next: NextFunction) => {
  try {
    const result = await WorkflowService.submitForReview(
      req.params.id, req.user.organizationId, req.user.id, req.user.role, req.body.comment
    );
    res.json({ success: true, data: result });
  } catch (e: any) {
    if (e.message?.includes('Invalid transition') || e.message?.includes('Role')) {
      return res.status(400).json({ success: false, message: e.message });
    }
    next(e);
  }
};

export const approveTask = async (req: any, res: Response, next: NextFunction) => {
  try {
    const result = await WorkflowService.approveTask({
      taskId: req.params.id,
      organizationId: req.user.organizationId,
      reviewerId: req.user.id,
      reviewerRole: req.user.role,
      comment: req.body.comment,
    });
    res.json({ success: true, data: result });
  } catch (e: any) {
    if (e.message?.includes('transition') || e.message?.includes('Role')) {
      return res.status(400).json({ success: false, message: e.message });
    }
    next(e);
  }
};

export const rejectTask = async (req: any, res: Response, next: NextFunction) => {
  try {
    if (!req.body.comment) return res.status(400).json({ success: false, message: 'Rejection comment required' });
    const result = await WorkflowService.rejectTask({
      taskId: req.params.id,
      organizationId: req.user.organizationId,
      reviewerId: req.user.id,
      reviewerRole: req.user.role,
      comment: req.body.comment,
    });
    res.json({ success: true, data: result });
  } catch (e: any) {
    if (e.message?.includes('transition') || e.message?.includes('Role')) {
      return res.status(400).json({ success: false, message: e.message });
    }
    next(e);
  }
};

export const assignTask = async (req: any, res: Response, next: NextFunction) => {
  try {
    await WorkflowService.assignTask(req.params.id, req.user.organizationId, req.body.assignedTo, req.user.id);
    res.json({ success: true, message: 'Task assigned' });
  } catch (e) { next(e); }
};

export const getTaskHistory = async (req: any, res: Response, next: NextFunction) => {
  try {
    const history = await WorkflowService.getStateHistory(req.params.id, req.user.organizationId);
    res.json({ success: true, data: history });
  } catch (e: any) {
    if (e.message === 'Task not found') return res.status(404).json({ success: false, message: e.message });
    next(e);
  }
};

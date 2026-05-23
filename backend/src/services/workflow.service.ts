import { randomUUID } from 'crypto';
import prisma from '../config/db';
import logger from '../utils/logger';
import { auditLogger } from '../utils/auditLogger';

// ─────────────────────────────────────────────
// State Machine Definition
// ─────────────────────────────────────────────

export type WorkflowState =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CLOSED';

// Valid transitions: { from: to[] }
const VALID_TRANSITIONS: Record<WorkflowState, WorkflowState[]> = {
  DRAFT: ['PENDING_REVIEW'],
  PENDING_REVIEW: ['IN_REVIEW', 'DRAFT'],
  IN_REVIEW: ['APPROVED', 'REJECTED', 'DRAFT'],
  APPROVED: ['CLOSED'],
  REJECTED: ['DRAFT'],
  CLOSED: [],
};

// Who can perform which transitions
const TRANSITION_PERMISSIONS: Record<string, string[]> = {
  'DRAFT→PENDING_REVIEW': ['ADMIN', 'COMPLIANCE_MANAGER', 'SECURITY_ANALYST'],
  'PENDING_REVIEW→IN_REVIEW': ['ADMIN', 'COMPLIANCE_MANAGER'],
  'PENDING_REVIEW→DRAFT': ['ADMIN', 'COMPLIANCE_MANAGER'],
  'IN_REVIEW→APPROVED': ['ADMIN', 'COMPLIANCE_MANAGER'],
  'IN_REVIEW→REJECTED': ['ADMIN', 'COMPLIANCE_MANAGER'],
  'IN_REVIEW→DRAFT': ['ADMIN'],
  'APPROVED→CLOSED': ['ADMIN', 'COMPLIANCE_MANAGER'],
  'REJECTED→DRAFT': ['ADMIN', 'COMPLIANCE_MANAGER', 'SECURITY_ANALYST'],
};

// ─────────────────────────────────────────────
// Workflow Service
// ─────────────────────────────────────────────

export const WorkflowService = {
  /**
   * Create a new workflow task.
   */
  async createTask(params: {
    organizationId: string;
    title: string;
    description?: string;
    priority?: string;
    dueDate?: Date;
    createdBy: string;
    assignedTo?: string;
    category?: string;
    framework?: string;
    fixTaskId?: string;
  }) {
    return prisma.workflow_tasks.create({
      data: {
        id: randomUUID(),
        organizationId: params.organizationId,
        title: params.title,
        description: params.description,
        state: 'DRAFT',
        priority: params.priority || 'medium',
        due_date: params.dueDate,
        created_by: params.createdBy,
        assigned_to: params.assignedTo,
        category: params.category || 'COMPLIANCE',
        framework: params.framework,
        fix_task_id: params.fixTaskId,
      },
      include: { creator: { select: { full_name: true, email: true } }, assignee: { select: { full_name: true, email: true } } },
    });
  },

  /**
   * Transition a task to a new state.
   * Validates permissions and records history.
   */
  async transition(params: {
    taskId: string;
    organizationId: string;
    toState: WorkflowState;
    actorId: string;
    actorRole: string;
    comment?: string;
  }): Promise<{ task: any; history: any }> {
    const task = await prisma.workflow_tasks.findFirst({
      where: { id: params.taskId, organizationId: params.organizationId },
    });
    if (!task) throw new Error('Workflow task not found');

    const fromState = task.state as WorkflowState;
    const toState = params.toState;

    // Validate transition is allowed
    const allowed = VALID_TRANSITIONS[fromState] || [];
    if (!allowed.includes(toState)) {
      throw new Error(`Invalid transition: ${fromState} → ${toState}`);
    }

    // Validate actor has permission
    const key = `${fromState}→${toState}`;
    const allowedRoles = TRANSITION_PERMISSIONS[key] || [];
    if (params.actorRole !== 'SUPER_ADMIN' && !allowedRoles.includes(params.actorRole)) {
      throw new Error(`Role '${params.actorRole}' cannot perform transition ${key}`);
    }

    // Execute transition
    const [updatedTask, historyEntry] = await prisma.$transaction([
      prisma.workflow_tasks.update({
        where: { id: params.taskId },
        data: { state: toState, updated_at: new Date() },
        include: {
          creator: { select: { full_name: true, email: true } },
          assignee: { select: { full_name: true, email: true } },
          approvals: { orderBy: { created_at: 'desc' }, take: 5 },
        },
      }),
      prisma.workflow_state_history.create({
        data: {
          task_id: params.taskId,
          from_state: fromState,
          to_state: toState,
          actor_id: params.actorId,
          comment: params.comment,
          metadata: { role: params.actorRole },
        },
      }),
    ]);

    // Audit log
    await auditLogger.log({
      organizationId: params.organizationId,
      userId: params.actorId,
      action: `WORKFLOW_TRANSITION:${key}`,
      eventType: 'GOVERNANCE',
      severity: 'info',
      resourceType: 'workflow_task',
      resourceId: params.taskId,
      outcome: 'success',
      metadata: { from: fromState, to: toState, comment: params.comment },
    });

    logger.info(`[Workflow] Task ${params.taskId}: ${fromState} → ${toState} by ${params.actorId}`);
    return { task: updatedTask, history: historyEntry };
  },

  /**
   * Submit a task for review.
   */
  async submitForReview(taskId: string, organizationId: string, actorId: string, actorRole: string, comment?: string) {
    return this.transition({ taskId, organizationId, toState: 'PENDING_REVIEW', actorId, actorRole, comment });
  },

  async handleTaskApprovalDecision(
    decision: 'APPROVED' | 'REJECTED',
    params: {
      taskId: string;
      organizationId: string;
      reviewerId: string;
      reviewerRole: string;
      comment?: string;
    }
  ) {
    const { task, history } = await this.transition({
      taskId: params.taskId,
      organizationId: params.organizationId,
      toState: decision,
      actorId: params.reviewerId,
      actorRole: params.reviewerRole,
      comment: params.comment,
    });

    await prisma.workflow_approvals.create({
      data: {
        task_id: params.taskId,
        reviewer_id: params.reviewerId,
        decision,
        comment: params.comment,
      },
    });

    return { task, history };
  },

  /**
   * Approve a task (reviewer action).
   */
  async approveTask(params: {
    taskId: string;
    organizationId: string;
    reviewerId: string;
    reviewerRole: string;
    comment?: string;
  }) {
    return this.handleTaskApprovalDecision('APPROVED', params);
  },

  /**
   * Reject a task (reviewer action).
   */
  async rejectTask(params: {
    taskId: string;
    organizationId: string;
    reviewerId: string;
    reviewerRole: string;
    comment: string;
  }) {
    return this.handleTaskApprovalDecision('REJECTED', params);
  },

  /**
   * Get task with full history and approvals.
   */
  async getTask(taskId: string, organizationId: string) {
    return prisma.workflow_tasks.findFirst({
      where: { id: taskId, organizationId },
      include: {
        creator: { select: { full_name: true, email: true } },
        assignee: { select: { full_name: true, email: true } },
        approvals: {
          include: { reviewer: { select: { full_name: true, email: true } } },
          orderBy: { created_at: 'desc' },
        },
        state_history: { orderBy: { created_at: 'desc' } },
        fix_task: { include: { evidence: true } },
      },
    });
  },

  /**
   * List tasks for an org with filters.
   */
  async listTasks(organizationId: string, filters: {
    state?: string;
    category?: string;
    assignedTo?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const { page = 1, limit = 20, ...rest } = filters;
    const where: any = { organizationId };
    if (rest.state) where.state = rest.state;
    if (rest.category) where.category = rest.category;
    if (rest.assignedTo) where.assigned_to = rest.assignedTo;

    const [tasks, total] = await Promise.all([
      prisma.workflow_tasks.findMany({
        where,
        include: {
          creator: { select: { full_name: true, email: true } },
          assignee: { select: { full_name: true, email: true } },
          _count: { select: { approvals: true, state_history: true } },
        },
        orderBy: [{ state: 'asc' }, { created_at: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.workflow_tasks.count({ where }),
    ]);

    return { tasks, total, page, limit };
  },

  /**
   * Assign a reviewer to a task.
   */
  async assignTask(taskId: string, organizationId: string, assignedTo: string, actorId: string) {
    const task = await prisma.workflow_tasks.updateMany({
      where: { id: taskId, organizationId },
      data: { assigned_to: assignedTo, updated_at: new Date() },
    });

    await auditLogger.log({
      organizationId,
      userId: actorId,
      action: 'WORKFLOW_ASSIGN',
      resourceType: 'workflow_task',
      resourceId: taskId,
      metadata: { assignedTo },
    });

    return task;
  },

  async getStateHistory(taskId: string, organizationId: string) {
    const task = await prisma.workflow_tasks.findFirst({ where: { id: taskId, organizationId } });
    if (!task) throw new Error('Task not found');

    return prisma.workflow_state_history.findMany({
      where: { task_id: taskId },
      orderBy: { created_at: 'desc' },
    });
  },

  async listPendingTasks(organizationId: string) {
    return prisma.workflow_tasks.findMany({
      where: {
        organizationId,
        state: 'PENDING_REVIEW',
        category: 'GOVERNANCE',
      },
      orderBy: { created_at: 'desc' },
    });
  },

  async resolveTask(
    taskId: string,
    organizationId: string,
    decision: 'APPROVED' | 'REJECTED',
    actorId: string,
    actorRole: string,
    comment?: string
  ) {
    const task = await prisma.workflow_tasks.findFirst({
      where: { id: taskId, organizationId },
    });
    if (!task) throw new Error('Workflow task not found');

    const toState = decision === 'APPROVED' ? 'APPROVED' : 'REJECTED';

    const [updatedTask] = await prisma.$transaction([
      prisma.workflow_tasks.update({
        where: { id: taskId },
        data: { state: toState, updated_at: new Date() },
      }),
      prisma.workflow_state_history.create({
        data: {
          task_id: taskId,
          from_state: task.state,
          to_state: toState,
          actor_id: actorId,
          comment: comment || `Governance resolved as ${decision}`,
          metadata: { role: actorRole },
        },
      }),
    ]);

    await auditLogger.log({
      organizationId,
      userId: actorId,
      action: `GOVERNANCE_RESOLVE:${decision}`,
      eventType: 'GOVERNANCE',
      severity: 'info',
      resourceType: 'workflow_task',
      resourceId: taskId,
      outcome: 'success',
      metadata: { decision, comment },
    });

    return updatedTask;
  },

  async createPendingWorkflowTask(
    organizationId: string,
    agent: string,
    action: string,
    decision: any,
    metadata: any
  ) {
    const adminUser = await prisma.users.findFirst({
      where: { organizationId, role: 'ADMIN', is_active: true }
    }) || await prisma.users.findFirst({
      where: { organizationId, is_active: true }
    });

    const createdBy = adminUser?.id;
    if (!createdBy) {
      throw new Error('No active user found in organization to assign task creation');
    }

    return prisma.workflow_tasks.create({
      data: {
        id: randomUUID(),
        organizationId,
        title: `Pending Approval: ${agent} - ${action}`,
        description: `Action blocked by governance due to high risk. Human review required. Reason: ${decision.reason}`,
        state: 'PENDING_REVIEW',
        priority: 'high',
        category: 'GOVERNANCE',
        framework: decision.compliance?.[0] || 'GENERAL',
        created_by: createdBy,
        metadata: {
          agent,
          action,
          organizationId,
          decision,
          metadata,
        },
      },
    });
  },
};



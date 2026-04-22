import prisma from '../config/db';
import { makeDecision, Decision } from './decisionEngine';
import { io } from '../server';

export type CheckPermissionResult = Decision;

export const checkPermission = async (agent: string, action: string, organizationId: string, metadata: any = {}): Promise<CheckPermissionResult> => {
  return await makeDecision(agent, action, organizationId, metadata);
};

export interface LogActivityData {
  organizationId: string;
  agent: string;
  action: string;
  status: string;
  risk: string;
  reason?: string;
  impact?: string;
  explanation?: string;
  confidence?: number;
  timeline?: any;
  compliance?: any;
  metadata?: any;
  requestId?: string;
  latency?: number;
  isPendingApproval?: boolean;
  overrideComment?: string;
  overriddenBy?: string;
  overrideTimestamp?: Date;
  approvedBy?: string;
}

export const logActivity = async (data: LogActivityData) => {
  const log = await prisma.logs.create({
    data: {
      organizationId: data.organizationId,
      agent: data.agent,
      action: data.action,
      status: data.status,
      risk: data.risk,
      reason: data.reason || null,
      impact: data.impact || null,
      explanation: data.explanation || null,
      confidence: data.confidence || null,
      timeline: data.timeline || null,
      compliance: data.compliance || {},
      metadata: data.metadata || {},
      requestId: data.requestId || null,
      latency: data.latency || null,
      isPendingApproval: data.isPendingApproval || false,
      overrideComment: data.overrideComment || null,
      overriddenBy: data.overriddenBy || null,
      overrideTimestamp: data.overrideTimestamp || null,
      approvedBy: data.approvedBy || null
    }
  });

  // Real-time Update: Emit to the specific organization room
  if (io) {
    io.to(`company_${data.organizationId}`).emit('new_activity', {
      ...log,
      // Map fields for frontend consistency if needed
      agent_id: log.agent,
      risk_score: log.risk,
      created_at: log.timestamp
    });
  }

  return log;
};

export const calculateSecurityScore = async (organizationId: string) => {
  const activityLogs = await prisma.logs.findMany({
    where: { organizationId: organizationId },
    take: 100,
    orderBy: { timestamp: 'desc' }
  });

  if (activityLogs.length === 0) return 100;

  const highRiskBlocked = activityLogs.filter(l => l.risk === 'high' && l.status === 'blocked').length;
  const highRiskAllowed = activityLogs.filter(l => l.risk === 'high' && l.status === 'allowed').length;

  let score = 100 - (highRiskAllowed * 5) + (highRiskBlocked * 2);
  
  return Math.min(Math.max(score, 0), 100);
};


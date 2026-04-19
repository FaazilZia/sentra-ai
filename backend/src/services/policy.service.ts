import prisma from '../config/db';
import { makeDecision, Decision } from './decisionEngine';

export type CheckPermissionResult = Decision;

export const checkPermission = async (agent: string, action: string, companyId: string, metadata: any = {}): Promise<CheckPermissionResult> => {
  return await makeDecision(agent, action, companyId, metadata);
};

export interface LogActivityData {
  companyId: string;
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
  return await prisma.logs.create({
    data: {
      companyId: data.companyId,
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
};

export const calculateSecurityScore = async (companyId: string) => {
  const activityLogs = await prisma.logs.findMany({
    where: { companyId: companyId },
    take: 100,
    orderBy: { timestamp: 'desc' }
  });

  if (activityLogs.length === 0) return 100;

  const highRiskBlocked = activityLogs.filter(l => l.risk === 'high' && l.status === 'blocked').length;
  const highRiskAllowed = activityLogs.filter(l => l.risk === 'high' && l.status === 'allowed').length;

  let score = 100 - (highRiskAllowed * 5) + (highRiskBlocked * 2);
  
  return Math.min(Math.max(score, 0), 100);
};


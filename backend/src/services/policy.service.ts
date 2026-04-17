import prisma from '../config/db';
import { makeDecision, Decision } from './decisionEngine';

export type CheckPermissionResult = Decision;

export const checkPermission = async (agent: string, action: string, tenantId: string, metadata: any = {}): Promise<CheckPermissionResult> => {
  return await makeDecision(agent, action, tenantId, metadata);
};

export interface LogActivityData {
  tenantId: string;
  agentId: string;
  action: string;
  status: string;
  riskScore: string;
  reason?: string;
  impact?: string;
  explanation?: string;
  confidence?: number;
  timeline?: any;
  compliance?: string[];
  metadata?: any;
  requestId?: string;
  latencyMs?: number;
}

export const logActivity = async (data: LogActivityData) => {
  return await (prisma as any).ai_activity_logs.create({
    data: {
      tenant_id: data.tenantId,
      agent_id: data.agentId,
      action: data.action,
      status: data.status,
      risk_score: data.riskScore,
      reason: data.reason || null,
      impact: data.impact || null,
      explanation: data.explanation || null,
      confidence: data.confidence || null,
      timeline: data.timeline || null,
      compliance: data.compliance || [],
      metadata: data.metadata || {},
      request_id: data.requestId || null,
      latency_ms: data.latencyMs || null
    }
  });
};

export const calculateSecurityScore = async (tenantId: string) => {
  const logs = await prisma.ai_activity_logs.findMany({
    where: { tenant_id: tenantId },
    take: 100,
    orderBy: { created_at: 'desc' }
  });

  if (logs.length === 0) return 100;

  const highRiskBlocked = logs.filter(l => l.risk_score === 'high' && l.status === 'blocked').length;
  const highRiskAllowed = logs.filter(l => l.risk_score === 'high' && l.status === 'allowed').length;

  let score = 100 - (highRiskAllowed * 5) + (highRiskBlocked * 2);
  
  return Math.min(Math.max(score, 0), 100);
};

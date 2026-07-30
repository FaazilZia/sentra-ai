import prisma from '../config/db';
import { makeDecision, Decision } from './decisionEngine';
import { io } from '../server';
import { NotificationService } from './notification.service';
import { SlackService } from './slack.service';
import logger from '../utils/logger';

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
  emitRealtime?: boolean;
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
  if (io && data.emitRealtime !== false) {
    let complianceArray: string[] = [];
    if (Array.isArray(data.compliance)) {
      complianceArray = data.compliance;
    } else if (data.compliance && typeof data.compliance === 'object') {
      if (Array.isArray(data.compliance.frameworks)) {
        complianceArray = data.compliance.frameworks;
      } else {
        complianceArray = Object.keys(data.compliance);
      }
    }

    io.to(`company_${data.organizationId}`).emit('activity_log', {
      id: data.requestId || log.id,
      organizationId: data.organizationId,
      timestamp: log.timestamp instanceof Date ? log.timestamp.toISOString() : String(log.timestamp),
      decision: data.status === 'blocked' ? 'BLOCK' : (data.isPendingApproval ? 'MODIFY' : 'ALLOW'),
      risk: data.risk,
      reason: data.reason || undefined,
      compliance: complianceArray,
      ai_summary: data.explanation || data.impact || undefined,
      metadata: {
        agent: data.agent,
        action: data.action
      }
    });
  }

  // Auto-create incident for blocked high-risk actions (Flow 4 requirement)
  if (data.status === 'blocked' && data.risk === 'high') {
    const incidentId = require('crypto').randomUUID();
    const details = data.reason || `High-risk action "${data.action}" was blocked by policy.`;
    await prisma.incidents.create({
      data: {
        id: incidentId,
        organizationId: data.organizationId,
        agent_id: data.agent,
        severity: 85, // High severity
        action: data.action,
        details,
        prompt_excerpt: data.action,
        response_excerpt: 'ACTION_BLOCKED',
        event_metadata: data.metadata || {},
        status: 'unresolved'
      }
    });

    try {
      const { AutomationService } = require('./automation.service');
      await AutomationService.triggerByEvent(data.organizationId, 'INCIDENT_CREATED', {
        incidentId,
        details,
        severity: 85
      });
    } catch (autoErr) {
      logger.error('Failed to trigger automations for incident:', autoErr);
    }

    await NotificationService.notifyIncidentCreated(
      data.organizationId,
      'High-Risk Incident Blocked',
      details,
      'incident',
      incidentId
    );

    await SlackService.notifyIncidentCreated(
      data.organizationId,
      `High-Risk Policy Incident Blocked: ${details}`,
      85
    );

    await SlackService.notifyPolicyViolation(
      data.organizationId,
      'High-Risk Action Blocked',
      data.agent
    );
  }

  // Persist BlockEvent to prisma.blockEvent for unified compliance view tracking
  const isBlockedOrFlagged = data.status === 'blocked' || 
    data.metadata?.mode === 'FLAG_ONLY' || 
    (data.reason && data.reason.includes('[FLAG_ONLY MODE]'));

  if (isBlockedOrFlagged) {
    try {
      let complianceFrameworks: string[] = [];
      if (Array.isArray(data.compliance)) {
        complianceFrameworks = data.compliance;
      } else if (data.compliance && typeof data.compliance === 'object') {
        if (Array.isArray(data.compliance.frameworks)) {
          complianceFrameworks = data.compliance.frameworks;
        } else {
          complianceFrameworks = Object.keys(data.compliance);
        }
      }

      // Check if agent exists in Agent table to fetch agent UUID & posture frameworks
      let resolvedAgentId = data.agent;
      const foundAgent = await prisma.agent.findFirst({
        where: {
          organizationId: data.organizationId,
          OR: [{ id: data.agent }, { name: data.agent }]
        },
        include: { postureFindings: { select: { framework: true } } }
      });

      if (foundAgent) {
        resolvedAgentId = foundAgent.id;
        const postureFws = foundAgent.postureFindings.map(f => f.framework);
        complianceFrameworks = Array.from(new Set([...complianceFrameworks, ...postureFws]));
      }

      await prisma.blockEvent.create({
        data: {
          organizationId: data.organizationId,
          agentId: resolvedAgentId,
          action: data.action,
          resource: data.metadata?.resource || data.metadata?.path || 'API_GATEWAY',
          status: data.status === 'blocked' ? 'BLOCKED' : 'FLAGGED',
          mode: data.metadata?.mode || (data.status === 'blocked' ? 'BLOCK' : 'FLAG_ONLY'),
          frameworks: complianceFrameworks,
        }
      });
    } catch (blockErr) {
      logger.error('[POLICY-SERVICE] Failed to create BlockEvent:', blockErr);
    }
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

  const score = 100 - (highRiskAllowed * 5) + (highRiskBlocked * 2);
  
  return Math.min(Math.max(score, 0), 100);
};

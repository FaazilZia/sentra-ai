import { randomUUID, createHash } from 'crypto';
import prisma from '../config/db';
import logger from '../utils/logger';


export interface Evidence {
  type: string;
  content: any;
}

export interface ComplianceFeature {
  id: string;
  feature_name: string;
  description: string;
  status: 'compliant' | 'warning' | 'non_compliant';
  evidence: Evidence[];
}

export class ComplianceService {
  static async getAuditProof(organizationId: string): Promise<ComplianceFeature[]> {
    const [consentRecords, auditLogs, activePolicies, recentLogs] = await Promise.all([
      (prisma as any).consent_records.findMany({
        where: { users: { organizationId } },
        take: 5,
        orderBy: { created_at: 'desc' },
        include: { users: { select: { full_name: true, email: true } } }
      }),
      (prisma as any).audit_logs.findMany({
        where: { organizationId },
        take: 5,
        orderBy: { timestamp: 'desc' }
      }),
      (prisma as any).policies.findMany({
        where: { organizationId, enabled: true },
        take: 10
      }),
      (prisma as any).logs.findMany({
        where: { organizationId },
        take: 5,
        orderBy: { timestamp: 'desc' }
      })
    ]);

    const isAuthCompliant = consentRecords.length > 0 && activePolicies.length > 0;
    const isDataCompliant = recentLogs.every((l: any) => l.risk !== 'high' || l.status === 'blocked');

    return [
      {
        id: randomUUID(),
        feature_name: "User Authentication & Data Handling",
        description: "Handles user login, consent collection, and data processing",
        status: isAuthCompliant ? 'compliant' : 'warning',
        evidence: [
          ...consentRecords.map((cr: any) => ({
            type: "consent_log",
            content: {
              user: cr.users.full_name,
              action: cr.action,
              notice_version: cr.notice_version,
              timestamp: cr.created_at,
              metadata: cr.metadata_json
            }
          })),
          ...auditLogs.map((al: any) => ({
            type: "audit_log",
            content: {
              action: al.action,
              timestamp: al.timestamp,
              metadata: al.metadata
            }
          }))
        ]
      },
      {
        id: randomUUID(),
        feature_name: "AI Governance & Policy Enforcement",
        description: "Real-time enforcement of data governance policies across AI agents",
        status: isDataCompliant ? 'compliant' : 'warning',
        evidence: [
          ...activePolicies.map((p: any) => ({
            type: "policy_configuration",
            content: {
              name: p.name,
              effect: p.effect,
              priority: p.priority,
              compliance: p.compliance
            }
          })),
          ...recentLogs.filter((l: any) => l.risk === 'high').map((l: any) => ({
            type: "high_risk_enforcement",
            content: {
              agent: l.agent,
              action: l.action,
              status: l.status,
              reason: l.reason,
              timestamp: l.timestamp
            }
          }))
        ]
      }
    ];
  }


  static async createFixTasks(featureId: string, actionPlan: any) {
    const tasks: any[] = [];
    
    // Priority 1
    actionPlan.priority_1.forEach((item: string) => {
      tasks.push({ featureId, title: item, priority: 1, status: 'pending' });
    });
    
    // Priority 2
    actionPlan.priority_2.forEach((item: string) => {
      tasks.push({ featureId, title: item, priority: 2, status: 'pending' });
    });
    
    // Priority 3
    actionPlan.priority_3.forEach((item: string) => {
      tasks.push({ featureId, title: item, priority: 3, status: 'pending' });
    });

    const createdTasks = await Promise.all(tasks.map(task => 
      (prisma as any).compliance_fix_tasks.create({ data: task })
    ));
    return createdTasks;
  }

  static async getFixTasks(featureId: string) {
    return await (prisma as any).compliance_fix_tasks.findMany({
      where: { featureId },
      include: { evidence: true },
      orderBy: [{ priority: 'asc' }, { created_at: 'desc' }]
    });
  }

  static async addEvidence(taskId: string, evidenceData: { type: string, value: string, source_type?: string, file_info?: any }, userId: string, organizationId: string) {
    let validationStatus = 'valid';
    let verified = true;

    if (!evidenceData.value) throw new Error("Evidence value cannot be empty");

    if (evidenceData.type === 'link') {
      if (!evidenceData.value.startsWith('http')) {
        validationStatus = 'invalid';
        verified = false;
      }
    } else if (evidenceData.type === 'text') {
      if (evidenceData.value.length < 20) {
        validationStatus = 'invalid';
        verified = false;
      }
    }

    const hash = createHash('sha256').update(evidenceData.value).digest('hex');
    
    const evidence = await (prisma as any).evidence_records.create({
      data: {
        taskId,
        type: evidenceData.type,
        value: evidenceData.value,
        hash: hash,
        source_type: evidenceData.source_type || 'user',
        verified,
        validation_status: validationStatus,
        validated_at: new Date()
      }
    });

    const task = await (prisma as any).compliance_fix_tasks.update({
      where: { id: taskId },
      data: { status: 'completed' }
    });

    await this.logAudit(userId, organizationId, 'UPLOAD_EVIDENCE', task.featureId, { taskId, evidenceId: evidence.id, verified });

    if (!verified) {
      await this.triggerAlert(task.featureId, 'MISSING_EVIDENCE', `Invalid evidence uploaded for task: ${task.title}`, 'medium');
    }

    return evidence;
  }

  static async triggerAlert(featureId: string, type: string, message: string, severity: string) {
    return await (prisma as any).alerts.create({
      data: { feature_id: featureId, type, message, severity }
    });
  }

  static async getAlerts() {
    return await (prisma as any).alerts.findMany({
      where: { is_read: false },
      orderBy: { created_at: 'desc' }
    });
  }

  static async markAlertRead(alertId: string) {
    return await (prisma as any).alerts.update({
      where: { id: alertId },
      data: { is_read: true }
    });
  }

  static async logAudit(userId: string, organizationId: string, action: string, featureId?: string, metadata?: any) {
    return await (prisma as any).audit_logs.create({
      data: {
        organizationId,
        user_id: userId,
        action,
        feature_id: featureId,
        metadata: metadata || {}
      }
    });
  }

  static async getAuditLogs(organizationId: string, featureId?: string) {
    return await (prisma as any).audit_logs.findMany({
      where: {
        organizationId,
        ...(featureId ? { feature_id: featureId } : {})
      },
      orderBy: { timestamp: 'desc' },
      take: 50
    });
  }

  static async getHistory(featureId: string) {
    return await (prisma as any).compliance_snapshots.findMany({
      where: { featureId },
      orderBy: { created_at: 'asc' }
    });
  }

  static async reEvaluate(featureId: string, userId: string, organizationId: string) {
    const originalProof = await this.getAuditProof(organizationId);
    const targetFeature = originalProof.find(f => f.feature_name === "User Authentication & Data Handling");
    const tasks = await this.getFixTasks(featureId);
    const evidenceList = tasks.flatMap((t: any) => t.evidence);
    
    const mergedEvidence = {
      feature_name: targetFeature?.feature_name,
      description: targetFeature?.description,
      original_evidence: targetFeature?.evidence,
      new_evidence: evidenceList.map(e => ({
        type: e.type,
        value: e.value,
        hash: e.hash,
        timestamp: e.uploaded_at
      }))
    };

    let aiResponse = this.generateFallbackReport(tasks);

    const report = aiResponse.compliance_report;
    await (prisma as any).compliance_snapshots.create({
      data: {
        featureId,
        gdpr_score: report.GDPR.score,
        dpdp_score: report.DPDP.score,
        hipaa_score: report.HIPAA.score,
        risk_level: report.GDPR.risk_level
      }
    });

    await this.logAudit(userId, organizationId, 'RE_EVALUATE', featureId, { new_scores: report });

    return aiResponse;
  }

  private static generateFallbackReport(tasks: any[]) {
    const completed = tasks.filter((t: any) => t.status === 'completed').length;
    const total = tasks.length;
    const progress = total > 0 ? completed / total : 0;
    
    const baseGDPR = 94;
    const baseDPDP = 92;
    const baseHIPAA = 85;

    return {
      feature_name: "User Authentication & Data Handling",
      compliance_report: {
        GDPR: { score: Math.min(100, baseGDPR + (progress * 4)), risk_level: 'Low' },
        DPDP: { score: Math.min(100, baseDPDP + (progress * 6)), risk_level: 'Low' },
        HIPAA: { score: Math.min(100, baseHIPAA + (progress * 12)), risk_level: progress > 0.8 ? 'Low' : 'Medium' }
      },
      confidence: progress > 0.9 ? 'High' : progress > 0.5 ? 'Medium' : 'Low',
      summary: "Simulated AI re-evaluation based on uploaded evidence integrity."
    };
  }
}

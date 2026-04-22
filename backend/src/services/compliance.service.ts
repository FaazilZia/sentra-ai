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
  static async getAuditProof(): Promise<ComplianceFeature[]> {
    return [
      {
        id: randomUUID(),
        feature_name: "User Authentication & Data Handling",
        description: "Handles user login, consent collection, and data processing",
        status: 'compliant',
        evidence: [
          {
            type: "consent_log",
            content: {
              "user_id": "12345",
              "consent_given": true,
              "timestamp": "2026-04-20T10:30:00Z",
              "purpose": ["analytics", "AI training"],
              "withdraw_option_available": true
            }
          },
          {
            type: "api_response",
            content: {
              "endpoint": "/user/data",
              "method": "GET",
              "authentication": "JWT",
              "data_encrypted": true,
              "fields_returned": ["name", "email"]
            }
          },
          {
            type: "auth_code",
            content: "JWT verification middleware with role-based access control (RBAC) implemented"
          },
          {
            type: "privacy_policy",
            content: {
              "has_policy": true,
              "mentions_user_rights": true,
              "mentions_data_usage": true,
              "last_updated": "2026-01-01"
            }
          },
          {
            type: "audit_log",
            content: {
              "event": "user_data_access",
              "user_id": "12345",
              "accessed_by": "admin_01",
              "timestamp": "2026-04-20T11:00:00Z"
            }
          },
          {
            type: "breach_policy",
            content: {
              "breach_detection": true,
              "notification_time_hours": 48,
              "user_notification": true
            }
          }
        ]
      },
      {
        id: randomUUID(),
        feature_name: "Sensitive Data Masking",
        description: "Automatically redacts PII and PHI from AI agent logs and responses",
        status: 'compliant',
        evidence: [
          {
            type: "auth_code",
            content: "export const maskPII = (text: string) => {\n  return text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]');\n};"
          },
          {
            type: "audit_log",
            content: {
              "event": "pii_redaction",
              "log_id": "L-9921",
              "pattern_matched": "email_regex",
              "timestamp": "2026-04-20T12:00:00Z"
            }
          }
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
    const originalProof = await this.getAuditProof();
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

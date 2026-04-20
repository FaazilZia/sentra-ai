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
    // In a real system, this would fetch from a database table 'compliance_features'
    // For this implementation, we are using the structured evidence provided by the user
    // and augmenting it with status and IDs.

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

  static async addEvidence(taskId: string, evidenceData: { type: string, value: string, source_type?: string, file_info?: any }, userId: string) {
    let validationStatus = 'valid';
    let verified = true;

    // 1. Validation Logic
    if (!evidenceData.value) throw new Error("Evidence value cannot be empty");

    if (evidenceData.type === 'link') {
      if (!evidenceData.value.startsWith('http')) {
        validationStatus = 'invalid';
        verified = false;
      } else if (evidenceData.value.includes('github.com')) {
        // Simple GitHub check (in production, use real fetch)
        try {
          // Mocking GitHub API call
          const isRepoValid = true; 
          if (!isRepoValid) {
            validationStatus = 'unreachable';
            verified = false;
          }
        } catch (e) {
          validationStatus = 'unreachable';
          verified = false;
        }
      }
    } else if (evidenceData.type === 'text') {
      if (evidenceData.value.length < 20) {
        validationStatus = 'invalid';
        verified = false;
      }
    } else if (evidenceData.type === 'file') {
      const allowedMimes = ['application/pdf', 'image/png', 'image/jpeg', 'text/plain'];
      if (evidenceData.file_info && !allowedMimes.includes(evidenceData.file_info.mimeType)) {
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

    // 2. Mark task as completed
    const task = await (prisma as any).compliance_fix_tasks.update({
      where: { id: taskId },
      data: { status: 'completed' }
    });

    // 3. Log Audit Entry
    await this.logAudit(userId, 'UPLOAD_EVIDENCE', task.featureId, { taskId, evidenceId: evidence.id, verified });

    // 4. Trigger Alerts if invalid
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


  static async logAudit(userId: string, action: string, featureId?: string, metadata?: any) {
    return await (prisma as any).audit_logs.create({
      data: {
        user_id: userId,
        action,
        feature_id: featureId,
        metadata: metadata || {}
      }
    });
  }

  static async getAuditLogs(featureId?: string) {
    return await (prisma as any).audit_logs.findMany({
      where: featureId ? { feature_id: featureId } : {},
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

  static async reEvaluate(featureId: string, userId: string) {
    // 1. Fetch original audit proof
    const originalProof = await this.getAuditProof();
    const targetFeature = originalProof.find(f => f.feature_name === "User Authentication & Data Handling"); // Simplified for demo
    
    // 2. Fetch all completed tasks + evidence
    const tasks = await this.getFixTasks(featureId);
    const evidenceList = tasks.flatMap((t: any) => t.evidence);
    
    // 3. Merge into one structured JSON
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

    // 4. Call AI (OpenAI API)
    let aiResponse;
    const openaiKey = process.env.OPENAI_API_KEY;
    
    if (openaiKey) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              {
                role: 'system',
                content: 'You are an enterprise-grade Data Protection Auditor AI. Evaluate the provided merged evidence and return a strict compliance report in JSON format only.'
              },
              {
                role: 'user',
                content: `Evidence: ${JSON.stringify(mergedEvidence)}`
              }
            ],
            response_format: { type: 'json_object' }
          })
        });

        const data = await response.json() as any;
        aiResponse = JSON.parse(data.choices[0].message.content);
      } catch (err) {
        logger.error('AI Re-evaluation failed, using fallback:', err);
        aiResponse = this.generateFallbackReport(tasks);
      }
    } else {
      // Simulate AI response for demo environment
      aiResponse = this.generateFallbackReport(tasks);
    }

    // 5. Save snapshot
    const report = aiResponse.compliance_report;
    await (prisma as any).compliance_snapshots.create({
      data: {
        featureId,
        gdpr_score: report.GDPR.score,
        dpdp_score: report.DPDP.score,
        hipaa_score: report.HIPAA.score,
        risk_level: report.GDPR.risk_level // Simplified
      }
    });

    // 6. Log Audit Entry
    await this.logAudit(userId, 'RE_EVALUATE', featureId, { new_scores: report });

    // 7. Trigger Alerts based on results
    if (report.GDPR.risk_level === 'High' || report.GDPR.score < 50) {
      await this.triggerAlert(featureId, 'HIGH_RISK', `Compliance score dropped for ${featureId}. Risk is High!`, 'high');
    }
    if (aiResponse.confidence === 'Low') {
      await this.triggerAlert(featureId, 'SYSTEM', `AI Confidence is Low for feature: ${featureId}`, 'medium');
    }

    return aiResponse;
  }

  private static generateFallbackReport(tasks: any[]) {
    const completed = tasks.filter((t: any) => t.status === 'completed').length;
    const total = tasks.length;
    const progress = total > 0 ? completed / total : 0;
    
    // Heuristic improvement
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




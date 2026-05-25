import prisma from '../config/db';

export class SeedingInProgressError extends Error {
  constructor() {
    super('Framework data is being initialized, please retry in a moment');
    this.name = 'SeedingInProgressError';
  }
}

export interface GovernanceReason {
  type: 'degradation' | 'improvement' | 'decay' | 'incident_breach' | 'health_penalty';
  value: number;
  msg: string;
}

export class NistAiRmfService {
  /**
   * Helper to ensure NIST AI RMF functions are seeded.
   * Throws SeedingInProgressError if the table is empty.
   */
  static async ensureSeeded(): Promise<void> {
    const count = await prisma.nist_ai_rmf_functions.count();
    if (count === 0) {
      throw new SeedingInProgressError();
    }
  }

  /**
   * Retrieve the complete framework overview, categories, subcategories,
   * associated live implementations, evidence freshness, and compensating controls overlay.
   */
  static async getFrameworkOverview(organizationId: string): Promise<any> {
    await this.ensureSeeded();

    // 1. Fetch all functions, categories, subcategories
    const functions = await prisma.nist_ai_rmf_functions.findMany({
      include: {
        categories: {
          include: {
            subcategories: true,
          },
          orderBy: { category_code: 'asc' },
        },
      },
      orderBy: { created_at: 'asc' },
    });

    // 2. Fetch or initialize implementations for this organization
    const subcategories = functions.flatMap(f => f.categories.flatMap(c => c.subcategories));
    const implementations = await prisma.nist_ai_rmf_implementations.findMany({
      where: { organizationId },
    });

    const implMap = new Map(implementations.map(impl => [impl.subcategory_id, impl]));
    const missingSubcategories = subcategories.filter(sub => !implMap.has(sub.id));

    if (missingSubcategories.length > 0) {
      const dataToCreate = missingSubcategories.map(sub => ({
        organizationId,
        subcategory_id: sub.id,
        status: 'NOT_STARTED',
        maturity_level: 1,
        risk_escalation_level: 'NORMAL',
      }));
      await prisma.nist_ai_rmf_implementations.createMany({
        data: dataToCreate,
        skipDuplicates: true,
      });

      // Re-fetch implementations to ensure we have the newly created rows
      const freshImplementations = await prisma.nist_ai_rmf_implementations.findMany({
        where: { organizationId },
      });
      freshImplementations.forEach(impl => {
        implMap.set(impl.subcategory_id, impl);
      });
    }

    const evidenceList = await prisma.governance_evidence.findMany({
      where: {
        organizationId,
        framework: 'NIST_AI_RMF',
        archived_at: null,
      },
      orderBy: { created_at: 'desc' },
    });

    // Group evidence by control code (subcategory code, e.g. GV-1.1)
    const evidenceMap = new Map<string, typeof evidenceList>();
    evidenceList.forEach(ev => {
      const list = evidenceMap.get(ev.control_code) || [];
      list.push(ev);
      evidenceMap.set(ev.control_code, list);
    });

    // 4. Fetch incidents for progressive stability recovery checks
    const incidents = await prisma.governance_incidents.findMany({
      where: { organizationId },
      orderBy: { created_at: 'desc' },
    });

    // Determine progressive recovery factor
    const openIncident = incidents.find(inc => inc.status === 'OPEN');
    let recoveryFactor = 1.0;
    let hasStabilityReset = false;

    if (openIncident) {
      recoveryFactor = 0.0;
      hasStabilityReset = true;
    } else {
      const resolvedIncidents = incidents.filter(inc => inc.status === 'RESOLVED' && inc.resolved_at);
      if (resolvedIncidents.length > 0) {
        const mostRecentResolved = resolvedIncidents[0];
        const resolvedAtTime = new Date(mostRecentResolved.resolved_at!).getTime();
        const diffMs = Date.now() - resolvedAtTime;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (diffDays < 7) {
          recoveryFactor = 0.0;
          hasStabilityReset = true;
        } else {
          // stability_window of 7 days met, apply +0.1 per day beyond day 7
          recoveryFactor = Math.min(1.0, (diffDays - 7) * 0.1);
        }
      }
    }

    // 5. Gather score metadata for explaining score changes
    const reasons: GovernanceReason[] = [];

    // Helper map to cache calculated base scores for compensating control lookup
    const subcategoryBaseScores = new Map<string, number>();
    const subcategoryCompScores = new Map<string, number>();

    // Initial pass: compute subcategory base scores & decay
    const subcategoryDetails = subcategories.map(sub => {
      const impl = implMap.get(sub.id)!;
      const subEvidence = evidenceMap.get(sub.subcategory_code) || [];
      
      // Calculate Subcategory Status Score (S_c)
      let statusScore = 0;
      if (impl.status === 'IMPLEMENTED') statusScore = 100;
      else if (impl.status === 'IN_PROGRESS') statusScore = 50;
      else if (impl.status === 'NOT_STARTED') statusScore = 0;
      
      // Calculate Freshness Multiplier (F_mult)
      let freshnessMultiplier = 1.0;
      let decayReasonLogged = false;

      if (subEvidence.length > 0) {
        const lastEvidence = subEvidence[0];
        const diffMs = Date.now() - new Date(lastEvidence.created_at).getTime();
        const inactivityDays = diffMs / (1000 * 60 * 60 * 24);

        if (inactivityDays > 15) {
          // Linear decay: max(0.1, 1 - (d_i - 15) * 0.02)
          freshnessMultiplier = Math.max(0.1, 1 - (inactivityDays - 15) * 0.02);
          
          // Apply progressive recovery logic:
          // Recover cap at original score base (S_c)
          if (recoveryFactor > 0) {
            freshnessMultiplier = Math.min(1.0, freshnessMultiplier + recoveryFactor);
          }
          
          if (freshnessMultiplier < 1.0) {
            decayReasonLogged = true;
          }
        }
      } else {
        // No evidence on file at all
        freshnessMultiplier = 0.5; // Decayed state due to no telemetry
      }

      const scoreBase = statusScore * freshnessMultiplier;
      subcategoryBaseScores.set(sub.subcategory_code, scoreBase);

      return {
        id: sub.id,
        subcategory_code: sub.subcategory_code,
        title: sub.title,
        description: sub.description,
        severity_weight: sub.severity_weight,
        depends_on_control: sub.depends_on_control,
        implementation_examples: sub.implementation_examples,
        suggested_evidence: sub.suggested_evidence,
        telemetry_sources: sub.telemetry_sources,
        implementation: {
          status: impl.status,
          maturity_level: impl.maturity_level,
          risk_escalation_level: impl.risk_escalation_level,
          notes: impl.notes,
          owner_user_id: impl.owner_user_id,
          due_date: impl.due_date,
          last_reviewed: impl.last_reviewed,
        },
        evidence_count: subEvidence.length,
        last_evidence_at: subEvidence.length > 0 ? subEvidence[0].created_at : null,
        scoreBase,
        freshnessMultiplier,
        decayReasonLogged,
      };
    });

    // Second pass: Apply compensating controls overlay & compile final scores
    let decayedCount = 0;
    let compControlsApplied = 0;

    const subcategoryFinalMap = new Map(subcategoryDetails.map(sub => {
      let scoreFinal = sub.scoreBase;

      // Compensating Control: if depends_on_control is set, we check that dependency control's score
      if (sub.depends_on_control) {
        const depScoreBase = subcategoryBaseScores.get(sub.depends_on_control) || 0;
        const compensatingScore = depScoreBase * 0.6;
        if (compensatingScore > scoreFinal) {
          scoreFinal = compensatingScore;
          compControlsApplied++;
        }
      }

      subcategoryCompScores.set(sub.subcategory_code, scoreFinal);

      if (sub.decayReasonLogged) {
        decayedCount++;
      }

      return [sub.subcategory_code, { ...sub, scoreFinal }];
    }));

    if (decayedCount > 0) {
      reasons.push({
        type: 'decay',
        value: -decayedCount,
        msg: `${decayedCount} subcategories exhibit evidence decay due to telemetry inactivity`,
      });
    }

    if (compControlsApplied > 0) {
      reasons.push({
        type: 'improvement',
        value: compControlsApplied,
        msg: `Compensating control offsets applied to ${compControlsApplied} subcategories`,
      });
    }

    if (hasStabilityReset) {
      reasons.push({
        type: 'incident_breach',
        value: 0,
        msg: 'Progressive posture recovery is halted due to active or recently resolved governance incidents',
      });
    }

    // 6. Aggregate scores to Categories
    const categoriesFormatted: any[] = [];
    const functionScores = new Map<string, number>();

    for (const fn of functions) {
      const catScores: number[] = [];

      const categoriesList = fn.categories.map(cat => {
        const subDetails = cat.subcategories.map(sub => subcategoryFinalMap.get(sub.subcategory_code)!);

        // Category Score: Weighted average of subcategories
        let sumWeights = 0;
        let sumWeightedScores = 0;

        subDetails.forEach(sub => {
          sumWeights += sub.severity_weight;
          sumWeightedScores += sub.scoreFinal * sub.severity_weight;
        });

        const categoryScore = sumWeights > 0 ? sumWeightedScores / sumWeights : 0;
        catScores.push(categoryScore);

        return {
          id: cat.id,
          category_code: cat.category_code,
          title: cat.title,
          description: cat.description,
          score: Math.round(categoryScore * 10) / 10,
          subcategories: subDetails.map(sub => ({
            code: sub.subcategory_code,
            title: sub.title,
            status: sub.implementation.status,
            maturityLevel: sub.implementation.maturity_level,
            score: Math.round(sub.scoreFinal * 10) / 10,
            telemetryLinked: sub.evidence_count,
            lastEvidenceAt: sub.last_evidence_at,
          })),
        };
      });

      // Function Score: Average of categories
      const functionScore = catScores.length > 0 ? catScores.reduce((a, b) => a + b, 0) / catScores.length : 0;
      functionScores.set(fn.function_code, functionScore);

      categoriesFormatted.push({
        function_code: fn.function_code,
        title: fn.title,
        description: fn.description,
        score: Math.round(functionScore * 10) / 10,
        categories: categoriesList,
      });
    }

    // 7. Calculate overall composite NIST Posture Score
    // Audit-trail Rationale for Function Weightings:
    // - GOVERN (30%): The structural foundation. Governed processes set the baseline; without policies, all checks are unverifiable.
    // - MEASURE (30%): The operational verification. Live telemetry, bias evaluations, and threat scans provide empirical assurance.
    // - MAP (20%): System classification and context mapping are essential precursors.
    // - MANAGE (20%): Response and escalations govern ongoing stabilization.
    const fGovern = functionScores.get('GOVERN') || 0;
    const fMap = functionScores.get('MAP') || 0;
    const fMeasure = functionScores.get('MEASURE') || 0;
    const fManage = functionScores.get('MANAGE') || 0;

    let compositeScore = fGovern * 0.3 + fMap * 0.2 + fMeasure * 0.3 + fManage * 0.2;

    // 8. Self-Monitoring Infrastructure & Health Penalty
    // Query system health status
    const healthLogs = await prisma.governance_system_health.findMany({
      orderBy: { created_at: 'desc' },
      take: 5,
    });

    let healthPenalty = 0;
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

    for (const log of healthLogs) {
      if (log.health_status === 'FAILED' || log.health_status === 'DEGRADED') {
        const lastRun = log.last_successful_run ? new Date(log.last_successful_run) : null;
        if (!lastRun || lastRun < fourHoursAgo) {
          healthPenalty = -10;
          reasons.push({
            type: 'health_penalty',
            value: -10,
            msg: `Self-Monitoring: Worker [${log.worker_name}] is degraded or has not reported successfully for 4+ hours`,
          });
          break; // Apply penalty once
        }
      }
    }

    if (healthPenalty < 0) {
      compositeScore = Math.max(0, compositeScore + healthPenalty);
    }

    // Determine data freshness status
    let dataFreshnessStatus = 'CURRENT';
    const staleLogs = healthLogs.filter(
      log => log.health_status !== 'HEALTHY' || (log.last_successful_run && new Date(log.last_successful_run) < fourHoursAgo)
    );
    if (staleLogs.length > 0) {
      dataFreshnessStatus = 'DEGRADED';
    } else if (decayedCount > 5) {
      dataFreshnessStatus = 'STALE';
    }

    const finalScore = Math.round(compositeScore * 10) / 10;

    return {
      score: finalScore,
      data_freshness_status: dataFreshnessStatus,
      reasons,
      incidents,
      functions: categoriesFormatted,
      summary: {
        total_subcategories: subcategories.length,
        implemented: implementations.filter(i => i.status === 'IMPLEMENTED').length,
        in_progress: implementations.filter(i => i.status === 'IN_PROGRESS').length,
        not_started: implementations.filter(i => i.status === 'NOT_STARTED').length,
        not_applicable: implementations.filter(i => i.status === 'NOT_APPLICABLE').length,
      },
    };
  }

  /**
   * Update the implementation details of a NIST subcategory.
   */
  static async updateImplementation(
    organizationId: string,
    subcategoryCode: string,
    data: {
      status: string;
      maturity_level?: number;
      risk_escalation_level?: string;
      notes?: string;
      owner_user_id?: string;
      due_date?: Date;
    }
  ): Promise<any> {
    await this.ensureSeeded();

    const subcategory = await prisma.nist_ai_rmf_subcategories.findUnique({
      where: { subcategory_code: subcategoryCode },
    });

    if (!subcategory) {
      throw new Error(`NIST Subcategory not found: ${subcategoryCode}`);
    }

    const impl = await prisma.nist_ai_rmf_implementations.upsert({
      where: {
        organizationId_subcategory_id: {
          organizationId,
          subcategory_id: subcategory.id,
        },
      },
      update: {
        status: data.status,
        maturity_level: data.maturity_level !== undefined ? data.maturity_level : undefined,
        risk_escalation_level: data.risk_escalation_level !== undefined ? data.risk_escalation_level : undefined,
        notes: data.notes !== undefined ? data.notes : undefined,
        owner_user_id: data.owner_user_id !== undefined ? data.owner_user_id : undefined,
        due_date: data.due_date !== undefined ? data.due_date : undefined,
        last_reviewed: new Date(),
      },
      create: {
        organizationId,
        subcategory_id: subcategory.id,
        status: data.status,
        maturity_level: data.maturity_level !== undefined ? data.maturity_level : 1,
        risk_escalation_level: data.risk_escalation_level !== undefined ? data.risk_escalation_level : 'NORMAL',
        notes: data.notes || null,
        owner_user_id: data.owner_user_id || null,
        due_date: data.due_date || null,
        last_reviewed: new Date(),
      },
    });

    // Create custom history log event
    await prisma.change_history?.create({
      data: {
        orgId: organizationId,
        entityType: 'NIST_AI_RMF_IMPLEMENTATION' as any,
        entityId: impl.id,
        changedBy: data.owner_user_id || '00000000-0000-0000-0000-000000000002', // Admin user id fallback
        changeType: 'UPDATE' as any,
        newValue: { status: data.status, maturity_level: data.maturity_level },
      },
    }).catch(() => {}); // Gracefully ignore if change_history isn't active/matching

    // Re-sync posture snapshot
    await this.syncPostureSnapshot(organizationId);

    return impl;
  }

  /**
   * Sync and persist a governance posture snapshot representing the explainable changes.
   */
  static async syncPostureSnapshot(organizationId: string): Promise<any> {
    const overview = await this.getFrameworkOverview(organizationId);

    // Save snapshot to database
    const snapshot = await prisma.governance_posture_snapshots.create({
      data: {
        organizationId,
        governance_posture_score: overview.score,
        nist_ai_rmf_score: overview.score,
        eu_ai_act_score: 0, // Injected via propagation later
        telemetry_coverage: 0.8, // Static indicator fallback
        interception_coverage: 0.95,
        maturity_level: overview.score >= 80 ? 4 : overview.score >= 50 ? 3 : 2,
        data_freshness_status: overview.data_freshness_status,
        reasons: overview.reasons as any,
      },
    });

    // Also update main compliance snapshot
    await prisma.compliance_snapshots.create({
      data: {
        organizationId,
        featureId: 'nist-ai-rmf',
        gdpr_score: 0,
        dpdp_score: 0,
        hipaa_score: 0,
        eu_ai_act_score: 0,
        nist_ai_rmf_score: overview.score,
        governance_posture_score: overview.score,
        framework_version: '1.0.0',
        risk_level: overview.score >= 80 ? 'low' : overview.score >= 50 ? 'medium' : 'high',
      },
    }).catch(() => {});

    return snapshot;
  }
}

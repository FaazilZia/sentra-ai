import prisma from '../config/db';

export class Iso42001Service {
  /**
   * Seed NOT_STARTED implementations for all existing controls for the given organization.
   */
  static async seedImplementations(organizationId: string, tx: any = prisma): Promise<void> {
    const controls = await tx.iso42001_controls.findMany();
    const implementations = await tx.iso42001_implementations.findMany({
      where: { organizationId }
    });

    const implControlIds = new Set(implementations.map((impl: any) => impl.control_id));
    const missingControls = controls.filter((c: any) => !implControlIds.has(c.id));

    if (missingControls.length > 0) {
      await tx.iso42001_implementations.createMany({
        data: missingControls.map((c: any) => ({
          organizationId,
          control_id: c.id,
          status: 'NOT_STARTED',
          notes: ''
        }))
      });
    }
  }

  /**
   * Get all clauses with their controls and organization's implementation status.
   * Auto-initializes implementations to NOT_STARTED for the organization if any are missing.
   */
  static async getFrameworkOverview(organizationId: string): Promise<{
    clauses: Array<{
      clause_code: string;
      title: string;
      clause_type: string;
      description: string;
      controls: Array<{
        control_code: string;
        title: string;
        description: string;
        evidence_required: string[];
        checklist_items: string[];
        implementation: {
          status: string;
          notes: string | null;
          due_date: Date | null;
          last_reviewed: Date | null;
        } | null;
      }>;
    }>;
    summary: {
      total_controls: number;
      implemented: number;
      in_progress: number;
      not_started: number;
      not_applicable: number;
      compliance_score: number;
    };
  }> {
    // 1. Ensure all controls have implementations for this organization
    await this.seedImplementations(organizationId, prisma);

    // 2. Query clauses, controls, and their implementations for this organization
    const clauses = await prisma.iso42001_clauses.findMany({
      where: { is_active: true },
      include: {
        controls: {
          include: {
            implementations: {
              where: { organizationId }
            }
          },
          orderBy: { control_code: 'asc' }
        }
      },
      orderBy: { clause_code: 'asc' }
    });

    // 3. Compile count stats
    let total_controls = 0;
    let implemented = 0;
    let in_progress = 0;
    let not_started = 0;
    let not_applicable = 0;

    const formattedClauses = clauses.map(cls => {
      return {
        clause_code: cls.clause_code,
        title: cls.title,
        clause_type: cls.clause_type,
        description: cls.description,
        controls: cls.controls.map(c => {
          total_controls++;
          const impl = c.implementations[0] || null;

          if (impl) {
            if (impl.status === 'IMPLEMENTED') implemented++;
            else if (impl.status === 'IN_PROGRESS') in_progress++;
            else if (impl.status === 'NOT_STARTED') not_started++;
            else if (impl.status === 'NOT_APPLICABLE') not_applicable++;
          } else {
            not_started++;
          }

          return {
            control_code: c.control_code,
            title: c.title,
            description: c.description,
            evidence_required: c.evidence_required,
            checklist_items: c.checklist_items,
            implementation: impl
              ? {
                  status: impl.status,
                  notes: impl.notes,
                  due_date: impl.due_date,
                  last_reviewed: impl.last_reviewed
                }
              : null
          };
        })
      };
    });

    const compliance_score = total_controls > 0 
      ? Math.round(((implemented + not_applicable) / total_controls) * 100) 
      : 0;

    return {
      clauses: formattedClauses,
      summary: {
        total_controls,
        implemented,
        in_progress,
        not_started,
        not_applicable,
        compliance_score
      }
    };
  }

  /**
   * Update the organization's implementation status of a specific control.
   */
  static async updateImplementation(
    organizationId: string,
    controlCode: string,
    data: {
      status: string;
      notes?: string;
      due_date?: Date;
    }
  ) {
    const control = await prisma.iso42001_controls.findUnique({
      where: { control_code: controlCode }
    });

    if (!control) {
      throw new Error(`Control not found with code: ${controlCode}`);
    }

    const impl = await prisma.iso42001_implementations.upsert({
      where: {
        organizationId_control_id: {
          organizationId,
          control_id: control.id
        }
      },
      update: {
        status: data.status,
        notes: data.notes !== undefined ? data.notes : undefined,
        due_date: data.due_date !== undefined ? data.due_date : undefined,
        last_reviewed: new Date()
      },
      create: {
        organizationId,
        control_id: control.id,
        status: data.status,
        notes: data.notes || null,
        due_date: data.due_date || null,
        last_reviewed: new Date()
      }
    });

    // Auto-sync posture snapshot
    await this.syncComplianceSnapshot(organizationId);

    return impl;
  }

  /**
   * Calculate and save the overall score into the compliance_snapshots table.
   */
  static async syncComplianceSnapshot(organizationId: string): Promise<void> {
    const overview = await this.getFrameworkOverview(organizationId);
    const score = overview.summary.compliance_score;

    await prisma.compliance_snapshots.create({
      data: {
        organizationId,
        featureId: 'iso42001',
        gdpr_score: 0,
        dpdp_score: 0,
        hipaa_score: 0,
        eu_ai_act_score: 0,
        nist_ai_rmf_score: 0,
        governance_posture_score: score,
        framework_version: '1.0.0',
        risk_level: score >= 80 ? 'low' : score >= 50 ? 'medium' : 'high'
      }
    }).catch(() => {});
  }
}

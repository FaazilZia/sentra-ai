import prisma from '../config/db';
import { countComplianceStatuses, seedMissingImplementations, findControlOrThrow } from '../utils/complianceCounter';

/**
 * Generic base service for ISO framework compliance (ISO 27001 / ISO 42001).
 * Eliminates duplication between iso27001.service.ts and iso42001.service.ts.
 */
export interface IsoFrameworkConfig {
  controlsTable: string;
  implementationsTable: string;
  clausesTable: string;
  featureId: string;
}

export interface ImplementationUpdateData {
  status: string;
  notes?: string;
  due_date?: Date;
}

export function createIsoFrameworkService(config: IsoFrameworkConfig) {
  const { controlsTable, implementationsTable, clausesTable, featureId } = config;

  async function seedImplementations(organizationId: string): Promise<void> {
    await seedMissingImplementations(prisma, controlsTable, implementationsTable, organizationId, { notes: '' });
  }

  function compileControlStats(clauses: any[]) {
    const allControls = clauses.flatMap((cls: any) => cls.controls);
    const summary = countComplianceStatuses(allControls);

    const formattedClauses = clauses.map(cls => {
      const base: Record<string, any> = {
        clause_code: cls.clause_code,
        title: cls.title,
        description: cls.description,
      };
      if (cls.clause_type !== undefined) {
        base.clause_type = cls.clause_type;
      }
      base.controls = cls.controls.map((c: any) => {
        const impl = c.implementations[0] || null;
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
                last_reviewed: impl.last_reviewed,
                created_at: impl.created_at
              }
            : null
        };
      });
      return base;
    });

    return { clauses: formattedClauses, summary };
  }

  async function getFrameworkOverview(organizationId: string) {
    await seedImplementations(organizationId);

    const clauses = await (prisma as any)[clausesTable].findMany({
      where: { is_active: true },
      include: {
        controls: {
          include: {
            implementations: { where: { organizationId } }
          },
          orderBy: { control_code: 'asc' }
        }
      },
      orderBy: { clause_code: 'asc' }
    });

    return compileControlStats(clauses);
  }

  async function updateImplementation(
    organizationId: string,
    controlCode: string,
    data: ImplementationUpdateData
  ) {
    const control = await findControlOrThrow(prisma, controlsTable, controlCode);

    const impl = await (prisma as any)[implementationsTable].upsert({
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

    await syncComplianceSnapshot(organizationId);
    return impl;
  }

  async function syncComplianceSnapshot(organizationId: string): Promise<void> {
    const overview = await getFrameworkOverview(organizationId);
    const score = overview.summary.compliance_score;

    await prisma.compliance_snapshots.create({
      data: {
        organizationId,
        featureId,
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

  return { seedImplementations, getFrameworkOverview, updateImplementation, syncComplianceSnapshot };
}

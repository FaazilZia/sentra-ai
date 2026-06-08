import prisma from '../config/db';
import { countComplianceStatuses, seedMissingImplementations, findControlOrThrow } from '../utils/complianceCounter';

export interface FTCImplementationUpdateData {
  status: string;
  notes?: string;
  due_date?: Date;
}

export class FtcService {
  static async seedImplementations(organizationId: string): Promise<void> {
    await seedMissingImplementations(prisma, 'ftc_controls', 'ftc_implementations', organizationId, { notes: '' });
  }

  private static compileControlStats(sections: any[]) {
    const allControls = sections.flatMap((sec: any) => sec.controls);
    const summary = countComplianceStatuses(allControls);

    const formattedSections = sections.map(sec => {
      return {
        section_code: sec.section_code,
        title: sec.title,
        description: sec.description,
        section_type: sec.section_type,
        controls: sec.controls.map((c: any) => {
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
        })
      };
    });

    return { sections: formattedSections, summary };
  }

  static async getFrameworkOverview(organizationId: string) {
    await this.seedImplementations(organizationId);

    const sections = await prisma.ftc_sections.findMany({
      where: { is_active: true },
      include: {
        controls: {
          include: {
            implementations: { where: { organizationId } }
          },
          orderBy: { control_code: 'asc' }
        }
      },
      orderBy: { section_code: 'asc' }
    });

    return this.compileControlStats(sections);
  }

  static async updateImplementation(
    organizationId: string,
    controlCode: string,
    data: FTCImplementationUpdateData
  ) {
    const control = await findControlOrThrow(prisma, 'ftc_controls', controlCode);

    const impl = await prisma.ftc_implementations.upsert({
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

    await this.syncComplianceSnapshot(organizationId);
    return impl;
  }

  static async syncComplianceSnapshot(organizationId: string): Promise<void> {
    const overview = await this.getFrameworkOverview(organizationId);
    const score = overview.summary.compliance_score;

    await prisma.compliance_snapshots.create({
      data: {
        organizationId,
        featureId: 'ftc',
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

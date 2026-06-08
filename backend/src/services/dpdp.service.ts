import prisma from '../config/db';

export class DpdpService {
  static async getChapters(organizationId: string) {
    return prisma.dpdpChapter.findMany({
      where: { organizationId },
      orderBy: { chapterNumber: 'asc' },
    });
  }

  static async getFrameworkControls(organizationId: string) {
    const controls = await prisma.dpdpControl.findMany({
      where: { organizationId },
      include: {
        chapter: true,
        implementations: true,
      },
      orderBy: { articleNumber: 'asc' },
    });
    return controls;
  }

  static async getStats(organizationId: string) {
    const controls = await prisma.dpdpControl.findMany({
      where: { organizationId },
    });

    const total = controls.length;
    const implemented = controls.filter(c => c.status === 'IMPLEMENTED').length;
    const inProgress = controls.filter(c => c.status === 'IN_PROGRESS').length;
    const notStarted = controls.filter(c => c.status === 'NOT_STARTED').length;
    const notApplicable = controls.filter(c => c.status === 'NOT_APPLICABLE').length;

    // Standard scoring: implemented + not_applicable + 0.5 * in_progress
    const compliance_score = total > 0 
      ? Math.round(((implemented + notApplicable + inProgress * 0.5) / total) * 100)
      : 100;

    return {
      total_controls: total,
      implemented,
      in_progress: inProgress,
      not_started: notStarted,
      not_applicable: notApplicable,
      compliance_score,
    };
  }

  static async updateControl(
    organizationId: string,
    controlId: string,
    data: { status: string; notes?: string }
  ) {
    // Verify control belongs to this organization
    const control = await prisma.dpdpControl.findFirst({
      where: { id: controlId, organizationId },
    });

    if (!control) {
      throw new Error('DPDP control not found or access denied');
    }

    const updated = await prisma.dpdpControl.update({
      where: { id: controlId },
      data: {
        status: data.status,
        notes: data.notes !== undefined ? data.notes : undefined,
      },
    });

    // Sync to compliance snapshots
    await this.syncComplianceSnapshot(organizationId);

    return updated;
  }

  static async syncComplianceSnapshot(organizationId: string) {
    const stats = await this.getStats(organizationId);
    const score = stats.compliance_score;

    await prisma.compliance_snapshots.create({
      data: {
        organizationId,
        featureId: 'dpdp',
        gdpr_score: 0,
        dpdp_score: score,
        hipaa_score: 0,
        eu_ai_act_score: 0,
        nist_ai_rmf_score: 0,
        governance_posture_score: score,
        framework_version: '1.0.0',
        risk_level: score >= 80 ? 'low' : score >= 50 ? 'medium' : 'high',
      },
    }).catch(() => {});
  }
}

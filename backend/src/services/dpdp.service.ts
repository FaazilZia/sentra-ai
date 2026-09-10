import prisma from '../config/db';
import { calculateComplianceStats, syncFrameworkSnapshot } from '../utils/complianceStats';

export class DpdpService {
  static async getChapters(organizationId: string) {
    return prisma.dpdpChapter.findMany({
      where: { organizationId },
      orderBy: { chapterNumber: 'asc' },
    });
  }

  static async getFrameworkControls(organizationId: string) {
    return prisma.dpdpControl.findMany({
      where: { organizationId },
      include: {
        chapter: true,
        implementations: true,
      },
      orderBy: { articleNumber: 'asc' },
    });
  }

  static async getStats(organizationId: string, violationCount = 0, openIncidentsCount = 0) {
    const controls = await prisma.dpdpControl.findMany({
      where: { organizationId },
    });
    return calculateComplianceStats(controls, violationCount, openIncidentsCount);
  }

  static async updateControl(
    organizationId: string,
    controlId: string,
    data: { status: string; notes?: string }
  ) {
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

    await this.syncComplianceSnapshot(organizationId);
    return updated;
  }

  static async syncComplianceSnapshot(organizationId: string) {
    const stats = await this.getStats(organizationId);
    return syncFrameworkSnapshot(organizationId, 'dpdp', stats.compliance_score);
  }
}

import prisma from '../config/db';
import { calculateComplianceStats, syncFrameworkSnapshot } from '../utils/complianceStats';

export class PciService {
  static async getChapters(organizationId: string) {
    return prisma.pciChapter.findMany({
      where: { organizationId },
      orderBy: { chapterNumber: 'asc' },
    });
  }

  static async getFrameworkControls(organizationId: string) {
    return prisma.pciControl.findMany({
      where: { organizationId },
      include: {
        chapter: true,
        implementations: true,
      },
      orderBy: { articleNumber: 'asc' },
    });
  }

  static async getStats(organizationId: string) {
    const controls = await prisma.pciControl.findMany({
      where: { organizationId },
    });
    return calculateComplianceStats(controls);
  }

  static async updateControl(
    organizationId: string,
    controlId: string,
    data: { status: string; notes?: string }
  ) {
    const control = await prisma.pciControl.findFirst({
      where: { id: controlId, organizationId },
    });

    if (!control) {
      throw new Error('PCI control not found or access denied');
    }

    const updated = await prisma.pciControl.update({
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
    return syncFrameworkSnapshot(organizationId, 'pci_dss', stats.compliance_score);
  }
}

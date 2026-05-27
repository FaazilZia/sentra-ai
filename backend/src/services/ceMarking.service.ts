import prisma from '../config/db';

const STEPS = [
  'step1_conformity_assessment',
  'step2_technical_documentation',
  'step3_quality_management',
  'step4_declaration_of_conformity',
  'step5_eu_database_registration',
  'step6_ce_mark_affixing',
  'step7_post_market_monitoring',
] as const;

export class CeMarkingService {
  static async getOrCreate(organizationId: string, aiSystemId: string) {
    let record = await prisma.ce_marking_records.findUnique({
      where: { organizationId_ai_system_id: { organizationId, ai_system_id: aiSystemId } },
      include: { ai_system: { select: { id: true, name: true, model_name: true } } },
    });
    if (!record) {
      record = await prisma.ce_marking_records.create({
        data: { organizationId, ai_system_id: aiSystemId },
        include: { ai_system: { select: { id: true, name: true, model_name: true } } },
      });
    }
    return record;
  }

  static async listForOrg(organizationId: string) {
    return prisma.ce_marking_records.findMany({
      where: { organizationId },
      include: { ai_system: { select: { id: true, name: true, model_name: true } } },
      orderBy: { updated_at: 'desc' },
    });
  }

  static async updateStep(
    organizationId: string,
    aiSystemId: string,
    step: string,
    status: string,
    notes?: string
  ) {
    const record = await this.getOrCreate(organizationId, aiSystemId);
    const updateData: any = { [step]: status };
    if (notes !== undefined) {
      const fieldNum = step.match(/\d+/)?.[0];
      if (fieldNum) {
        updateData[`step${fieldNum}_notes`] = notes;
      }
    }

    // Recalculate overall_status
    const updatedRecord = await prisma.ce_marking_records.update({
      where: { id: record.id },
      data: updateData,
    });

    const allStepStatuses = STEPS.map(s => (updatedRecord as any)[s]);
    const allCompleted = allStepStatuses.every(s => s === 'COMPLETED');
    const anyInProgress = allStepStatuses.some(s => s === 'IN_PROGRESS' || s === 'COMPLETED');
    const overallStatus = allCompleted ? 'CERTIFIED' : anyInProgress ? 'IN_PROGRESS' : 'NOT_STARTED';

    return prisma.ce_marking_records.update({
      where: { id: record.id },
      data: {
        overall_status: overallStatus,
        certified_at: allCompleted ? new Date() : null,
      },
      include: { ai_system: { select: { id: true, name: true, model_name: true } } },
    });
  }

  static async updateClassification(organizationId: string, aiSystemId: string, classification: string, scopeNotes?: string) {
    const record = await this.getOrCreate(organizationId, aiSystemId);
    return prisma.ce_marking_records.update({
      where: { id: record.id },
      data: { classification, scope_notes: scopeNotes },
    });
  }
}

import logger from './logger';

/**
 * Generic ISO framework seeder that eliminates duplication between
 * iso27001Seed.service.ts and iso42001Seed.service.ts.
 */
export interface IsoSeedClause {
  clause_code: string;
  title: string;
  description: string;
  clause_type?: string;
}

export interface IsoSeedControl {
  clause_code: string;
  control_code: string;
  title: string;
  description: string;
  evidence_required: string[];
  checklist_items: string[];
}

interface IsoSeedConfig {
  frameworkLabel: string;
  clauseModel: string;
  controlModel: string;
  clauses: IsoSeedClause[];
  controls: IsoSeedControl[];
}

export async function seedIsoFramework(prisma: any, config: IsoSeedConfig): Promise<void> {
  const { frameworkLabel, clauseModel, controlModel, clauses, controls } = config;
  logger.info(`🌱 Seeding ${frameworkLabel} global framework (Clauses & Controls)...`);
  let clauseCount = 0;
  let controlCount = 0;

  for (const clauseData of clauses) {
    const createPayload: Record<string, any> = {
      clause_code: clauseData.clause_code,
      title: clauseData.title,
      description: clauseData.description,
      is_active: true,
    };
    const updatePayload: Record<string, any> = {
      title: clauseData.title,
      description: clauseData.description,
    };

    if (clauseData.clause_type) {
      createPayload.clause_type = clauseData.clause_type;
      updatePayload.clause_type = clauseData.clause_type;
    }

    const clause = await (prisma as any)[clauseModel].upsert({
      where: { clause_code: clauseData.clause_code },
      update: updatePayload,
      create: createPayload,
    });
    clauseCount++;

    const relatedControls = controls.filter(c => c.clause_code === clauseData.clause_code);
    for (const ctrlData of relatedControls) {
      await (prisma as any)[controlModel].upsert({
        where: { control_code: ctrlData.control_code },
        update: {
          clause_id: clause.id,
          title: ctrlData.title,
          description: ctrlData.description,
          evidence_required: ctrlData.evidence_required,
          checklist_items: ctrlData.checklist_items,
        },
        create: {
          clause_id: clause.id,
          control_code: ctrlData.control_code,
          title: ctrlData.title,
          description: ctrlData.description,
          evidence_required: ctrlData.evidence_required,
          checklist_items: ctrlData.checklist_items,
        },
      });
      controlCount++;
    }
  }

  logger.info(`✅ ${frameworkLabel} Seeding Completed: seeded ${clauseCount} clauses, ${controlCount} controls.`);
}

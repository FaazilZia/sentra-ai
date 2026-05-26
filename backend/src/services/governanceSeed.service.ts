import prisma from '../config/db';
import { randomUUID } from 'crypto';
import logger from '../utils/logger';

export interface ControlSeedInput {
  framework: string;
  control_id: string;
  title: string;
  description: string;
  category: string;
}

export interface ObligationSeedInput {
  framework: string;
  article_or_task: string;
  description: string;
  linked_control_code?: string; // We'll link this to the seeded control by framework + control_id
}

import governanceData from './governanceData.json';

const BASELINE_CONTROLS: ControlSeedInput[] = governanceData.controls;
const BASELINE_OBLIGATIONS: ObligationSeedInput[] = governanceData.obligations;

export async function seedOrganizationGovernance(organizationId: string, txClient?: any): Promise<void> {
  try {
    logger.info(`[GovernanceSeeder] Starting seeding for org ${organizationId}`);

    const runSeeding = async (tx: any) => {
      // 1. Fetch all existing controls, control implementations, and compliance obligations in single queries
      const [existingControls, existingImplementations, existingObligations] = await Promise.all([
        tx.controls.findMany({ where: { organizationId } }),
        tx.control_implementations.findMany({ where: { organizationId } }),
        tx.compliance_obligations.findMany({ where: { organizationId } })
      ]);

      const existingControlsMap = new Map<string, string>(
        existingControls.map((c: any) => [`${c.framework}_${c.control_id}`, c.id])
      );
      const existingImplementationsSet = new Set<string>(
        existingImplementations.map((ci: any) => ci.control_id)
      );
      const existingObligationsSet = new Set<string>(
        existingObligations.map((o: any) => `${o.framework}_${o.article_or_task}`)
      );

      const controlsPromises: Promise<any>[] = [];
      const implPromises: Promise<any>[] = [];
      const createdControlsMap = new Map<string, string>();

      for (const ctrl of BASELINE_CONTROLS) {
        const mapKey = `${ctrl.framework}_${ctrl.control_id}`;
        let controlId = existingControlsMap.get(mapKey);

        if (!controlId) {
          controlId = randomUUID();
          controlsPromises.push(
            tx.controls.create({
              data: {
                id: controlId,
                organizationId,
                framework: ctrl.framework,
                control_id: ctrl.control_id,
                title: ctrl.title,
                description: ctrl.description,
                category: ctrl.category,
              },
            })
          );
        }
        createdControlsMap.set(mapKey, controlId);

        if (!existingImplementationsSet.has(controlId)) {
          implPromises.push(
            tx.control_implementations.create({
              data: {
                id: randomUUID(),
                organizationId,
                control_id: controlId,
                status: 'NOT_STARTED',
                evidence: '[]',
              },
            })
          );
        }
      }

      // Execute controls creation concurrently
      if (controlsPromises.length > 0) {
        await Promise.all(controlsPromises);
      }
      if (implPromises.length > 0) {
        await Promise.all(implPromises);
      }

      // 2. Seed Compliance Obligations
      const obligationsPromises: Promise<any>[] = [];
      for (const ob of BASELINE_OBLIGATIONS) {
        const obKey = `${ob.framework}_${ob.article_or_task}`;
        if (!existingObligationsSet.has(obKey)) {
          let linkedControlId: string | null = null;
          if (ob.linked_control_code) {
            const mapKey = `${ob.framework}_${ob.linked_control_code}`;
            linkedControlId = createdControlsMap.get(mapKey) || null;
          }
          obligationsPromises.push(
            tx.compliance_obligations.create({
              data: {
                id: randomUUID(),
                organizationId,
                framework: ob.framework,
                article_or_task: ob.article_or_task,
                description: ob.description,
                status: 'PENDING',
                linked_control_id: linkedControlId,
              },
            })
          );
        }
      }

      if (obligationsPromises.length > 0) {
        await Promise.all(obligationsPromises);
      }
    };

    if (txClient) {
      await runSeeding(txClient);
    } else {
      await prisma.$transaction(async (tx) => {
        await runSeeding(tx);
      }, { timeout: 120000 });
    }

    logger.info(`[GovernanceSeeder] Finished seeding controls and obligations successfully for org ${organizationId}`);
  } catch (error) {
    logger.error(`[GovernanceSeeder] Failed to seed governance frameworks for org ${organizationId}:`, error);
    throw error;
  }
}

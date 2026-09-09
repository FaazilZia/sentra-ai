import prisma from '../config/db';
import { randomUUID } from 'crypto';
import logger from '../utils/logger';
import { seedGdpr } from './gdprSeed.service';
import { seedHipaa } from './hipaaSeed.service';
import { seedPci } from './pciSeed.service';
import { seedDpdp } from './dpdpSeed.service';
import { enqueueGovernanceSeed } from './queue.service';

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
      await seedGdpr(organizationId, txClient);
      await seedHipaa(organizationId, txClient);
      await seedPci(organizationId, txClient);
      await seedDpdp(organizationId, txClient);
    } else {
      await runSeeding(prisma);
      await seedGdpr(organizationId, prisma);
      await seedHipaa(organizationId, prisma);
      await seedPci(organizationId, prisma);
      await seedDpdp(organizationId, prisma);
    }

    logger.info(`[GovernanceSeeder] Finished seeding controls and obligations successfully for org ${organizationId}`);
  } catch (error) {
    logger.error(`[GovernanceSeeder] Failed to seed governance frameworks for org ${organizationId}:`, error);
    throw error;
  }
}

export interface GovernanceSeedingStatus {
  isComplete: boolean;
  baselineControls: number;
  gdprControls: number;
  hipaaControls: number;
  pciControls: number;
  dpdpControls: number;
}

export async function checkGovernanceSeedingStatus(organizationId: string): Promise<GovernanceSeedingStatus> {
  const [baselineControls, gdprControls, hipaaControls, pciControls, dpdpControls] = await Promise.all([
    prisma.controls.count({ where: { organizationId } }),
    prisma.gdpr_controls.count({ where: { organizationId } }),
    prisma.hipaaControl.count({ where: { organizationId } }),
    prisma.pciControl.count({ where: { organizationId } }),
    prisma.dpdpControl.count({ where: { organizationId } }),
  ]);

  const isComplete =
    baselineControls >= 20 &&
    gdprControls >= 25 &&
    hipaaControls >= 18 &&
    pciControls >= 12 &&
    dpdpControls >= 12;

  return {
    isComplete,
    baselineControls,
    gdprControls,
    hipaaControls,
    pciControls,
    dpdpControls,
  };
}

export const activeSeedings = new Set<string>();
export const completedGovernanceOrgs = new Set<string>();

export async function triggerGovernanceSeeding(organizationId: string): Promise<void> {
  if (!organizationId) return;
  if (activeSeedings.has(organizationId)) {
    logger.info(`[GovernanceSeeder] Seeding already in progress for org ${organizationId}, skipping duplicate trigger`);
    return;
  }

  // Attempt BullMQ enqueue if available
  try {
    const enqueued = await enqueueGovernanceSeed(organizationId);
    if (enqueued) {
      return;
    }
  } catch (queueErr) {
    logger.warn(`[GovernanceSeeder] BullMQ enqueue check failed for org ${organizationId}, using setImmediate fallback:`, queueErr);
  }

  // Fallback: asynchronous background execution via setImmediate
  activeSeedings.add(organizationId);
  setImmediate(async () => {
    try {
      logger.info(`[GovernanceSeeder] Starting background governance seeding for org ${organizationId}`);
      await seedOrganizationGovernance(organizationId);
      completedGovernanceOrgs.add(organizationId);
      logger.info(`[GovernanceSeeder] Successfully completed background governance seeding for org ${organizationId}`);
    } catch (err: any) {
      logger.error(`[GovernanceSeeder] Background governance seeding failed for org ${organizationId}: ${err?.message || err}`);
    } finally {
      activeSeedings.delete(organizationId);
    }
  });
}

export async function checkAndTriggerGovernanceFallback(organizationId: string): Promise<void> {
  if (!organizationId) return;
  if (completedGovernanceOrgs.has(organizationId) || activeSeedings.has(organizationId)) {
    return;
  }

  try {
    const status = await checkGovernanceSeedingStatus(organizationId);
    if (!status.isComplete) {
      logger.warn(
        `[GovernanceFallback] Org ${organizationId} has incomplete governance seeding ` +
        `(baseline: ${status.baselineControls}/20, GDPR: ${status.gdprControls}/25, HIPAA: ${status.hipaaControls}/18, PCI: ${status.pciControls}/12, DPDP: ${status.dpdpControls}/12). Triggering re-seed...`
      );
      await triggerGovernanceSeeding(organizationId);
    } else {
      completedGovernanceOrgs.add(organizationId);
    }
  } catch (err: any) {
    logger.error(`[GovernanceFallback] Failed to verify governance status for org ${organizationId}: ${err?.message || err}`);
  }
}

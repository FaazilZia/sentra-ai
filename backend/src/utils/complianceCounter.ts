/**
 * Shared compliance utilities used across framework services
 * (GDPR, DPDP, HIPAA, PCI-DSS, NIST AI RMF).
 * Eliminates duplicated status-counting and implementation logic.
 */
export interface ComplianceStatusCounts {
  total_controls: number;
  implemented: number;
  in_progress: number;
  not_started: number;
  not_applicable: number;
  compliance_score: number;
}

export function countComplianceStatuses(controlSets: Array<{ implementations: any[] }>): ComplianceStatusCounts {
  let total_controls = 0;
  let implemented = 0;
  let in_progress = 0;
  let not_started = 0;
  let not_applicable = 0;

  for (const c of controlSets) {
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
  }

  const compliance_score = total_controls > 0 
    ? Math.round(((implemented + not_applicable) / total_controls) * 100) 
    : 0;

  return { total_controls, implemented, in_progress, not_started, not_applicable, compliance_score };
}

/**
 * Ensure every control has a corresponding implementation row for the org.
 * Creates NOT_STARTED rows for any missing controls.
 */
export async function seedMissingImplementations(
  db: any,
  controlsModel: string,
  implModel: string,
  organizationId: string,
  defaultExtra: Record<string, any> = {}
): Promise<void> {
  const controls = await db[controlsModel].findMany();
  const implementations = await db[implModel].findMany({ where: { organizationId } });

  const existingIds = new Set(implementations.map((impl: any) => impl.control_id));
  const missing = controls.filter((c: any) => !existingIds.has(c.id));

  if (missing.length > 0) {
    try {
      await db[implModel].createMany({
        data: missing.map((c: any) => ({
          organizationId,
          control_id: c.id,
          status: 'NOT_STARTED',
          ...defaultExtra
        })),
        skipDuplicates: true
      });
    } catch (err) {
      console.warn(`[SEED] seedMissingImplementations concurrency conflict handled:`, err);
    }
  }
}

/**
 * Find a control by code, then upsert its implementation for the org.
 * Shared between framework updateImplementation methods.
 */
export async function findControlOrThrow(
  db: any,
  controlsModel: string,
  controlCode: string
): Promise<any> {
  const control = await db[controlsModel].findUnique({ where: { control_code: controlCode } });
  if (!control) {
    throw new Error(`Control not found with code: ${controlCode}`);
  }
  return control;
}


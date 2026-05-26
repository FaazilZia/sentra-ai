/**
 * Shared compliance status counter used across framework services
 * (ISO 27001, ISO 42001, EU AI Act, NIST AI RMF).
 * Eliminates duplicated status-counting logic detected by SonarCloud.
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

import prisma from '../config/db';

export interface ControlStatusItem {
  status: string;
}

export function calculateComplianceStats(
  controls: ControlStatusItem[],
  violationCount: number = 0,
  openIncidentsCount: number = 0
) {
  const total = controls.length;
  const implemented = controls.filter(c => c.status === 'IMPLEMENTED').length;
  const inProgress = controls.filter(c => c.status === 'IN_PROGRESS').length;
  const notStarted = controls.filter(c => c.status === 'NOT_STARTED').length;
  const notApplicable = controls.filter(c => c.status === 'NOT_APPLICABLE').length;

  const baseScore = total > 0 
    ? Math.round(((implemented + notApplicable + inProgress * 0.5) / total) * 100)
    : 0;

  // Dynamic deduction based on real SDK telemetry & incidents
  const deduction = (openIncidentsCount * 10) + (violationCount * 5);
  const compliance_score = Math.max(0, baseScore - deduction);

  return {
    total_controls: total,
    implemented,
    in_progress: inProgress,
    not_started: notStarted,
    not_applicable: notApplicable,
    compliance_score,
  };
}

export async function syncFrameworkSnapshot(organizationId: string, featureId: string, score: number) {
  return prisma.compliance_snapshots.create({
    data: {
      organizationId,
      featureId,
      gdpr_score: featureId === 'gdpr' ? score : 0,
      dpdp_score: featureId === 'dpdp' ? score : 0,
      hipaa_score: featureId === 'hipaa' ? score : 0,
      pci_dss_score: featureId === 'pci_dss' ? score : 0,
      nist_ai_rmf_score: featureId === 'nist_ai_rmf' ? score : 0,
      governance_posture_score: score,
      framework_version: '1.0.0',
      risk_level: score >= 80 ? 'low' : score >= 50 ? 'medium' : 'high',
    },
  }).catch(() => {});
}

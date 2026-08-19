import prisma from '../config/db';

export interface ControlStatusItem {
  status: string;
}

export function calculateComplianceStats(controls: ControlStatusItem[]) {
  const total = controls.length;
  const implemented = controls.filter(c => c.status === 'IMPLEMENTED').length;
  const inProgress = controls.filter(c => c.status === 'IN_PROGRESS').length;
  const notStarted = controls.filter(c => c.status === 'NOT_STARTED').length;
  const notApplicable = controls.filter(c => c.status === 'NOT_APPLICABLE').length;

  const compliance_score = total > 0 
    ? Math.round(((implemented + notApplicable + inProgress * 0.5) / total) * 100)
    : 0;

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

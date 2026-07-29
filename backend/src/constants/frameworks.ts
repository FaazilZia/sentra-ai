export const SUPPORTED_FRAMEWORKS = [
  'GDPR',
  'DPDP',
  'HIPAA',
  'PCI_DSS',
  'NIST_AI_RMF',
] as const;

export type SupportedFramework = (typeof SUPPORTED_FRAMEWORKS)[number];

export const FRAMEWORK_LABELS: Record<SupportedFramework, string> = {
  GDPR: 'EU General Data Protection Regulation (GDPR)',
  DPDP: 'India Digital Personal Data Protection Act (DPDP)',
  HIPAA: 'Health Insurance Portability and Accountability Act (HIPAA)',
  PCI_DSS: 'Payment Card Industry Data Security Standard (PCI-DSS)',
  NIST_AI_RMF: 'NIST AI Risk Management Framework 1.0 (NIST AI RMF)',
};

/**
 * Shared governance UI helpers extracted to eliminate SonarCloud duplication
 * between Controls, Obligations, and other governance pages.
 */

/** Map framework codes to human-readable labels */
export function getFrameworkLabel(fw: string): string {
  switch (fw) {
    case 'GDPR': return 'GDPR';
    case 'DPDP': return 'DPDP Act';
    case 'HIPAA': return 'HIPAA';
    case 'PCI_DSS': return 'PCI-DSS';
    case 'NIST_AI_RMF': return 'NIST AI RMF 1.0';
    default: return fw.replaceAll('_', ' ');
  }
}

/** Map status values to Tailwind badge color classes */
export function getStatusBadgeColor(st?: string): string {
  switch (st) {
    case 'IMPLEMENTED':
    case 'MET':
      return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    case 'IN_PROGRESS': return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
    case 'NOT_APPLICABLE': return 'bg-gray-500/10 text-gray-400 border border-gray-500/20';
    default: return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
  }
}

/** Common search input class string used across governance pages */
export const SEARCH_INPUT_CLASS = 'w-full bg-[#111827]/60 border border-gray-800 rounded-xl py-2.5 pl-11 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-all';

/** Common filter select class string used across governance pages */
export const SELECT_FILTER_CLASS = 'bg-[#111827]/60 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500';


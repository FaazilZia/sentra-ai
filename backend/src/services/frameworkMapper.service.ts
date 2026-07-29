import prisma from '../config/db';
import { SUPPORTED_FRAMEWORKS, SupportedFramework } from '../constants/frameworks';

/**
 * Explicit 25 Legal & Regulatory Citations Across 5 Concern Domains
 * Standardized constants for auditing, validation, and maintenance.
 */
export const CITATIONS = {
  DATA_MINIMIZATION: {
    GDPR: 'Art. 5(1)(c) — Data Minimization Principle',
    DPDP: 'Sec. 6(1) — Purpose Limitation & Scoping',
    HIPAA: '45 CFR § 164.312(a) — PHI Storage & Access Scope',
    PCI_DSS: 'Req 3.1 — Cardholder Data Storage Minimization',
    NIST_AI_RMF: 'MAP-1.1 — Context & System Boundaries Mapping',
  },
  ACCESS_CONTROL: {
    GDPR: 'Art. 32(1)(b) — Confidentiality & Access Security',
    DPDP: 'Sec. 8(5) — Reasonable Security Safeguards',
    HIPAA: '45 CFR § 164.312(a)(1) — Access Control & Authentication',
    PCI_DSS: 'Req 7.1 — Restrict Access to Need-to-Know',
    NIST_AI_RMF: 'GV-2.1 — Governance Scoping & Roles',
  },
  AUDIT_LOGGING: {
    GDPR: 'Art. 30/32 — Processing Records & Auditability',
    DPDP: 'Sec. 8(4) — Activity Verification & Records',
    HIPAA: '45 CFR § 164.312(b) — Audit Controls & Telemetry',
    PCI_DSS: 'Req 10.1 — System Logging & Audit Review',
    NIST_AI_RMF: 'MEASURE-2.3 — Model Telemetry & Event Logging',
  },
  THIRD_PARTY_SHARING: {
    GDPR: 'Art. 28 — Data Processor Agreements (DPA)',
    DPDP: 'Sec. 8(2) — Data Fiduciary & Processor Scoping',
    HIPAA: '45 CFR § 164.502 — Business Associate Agreement (BAA)',
    PCI_DSS: 'Req 12.8 — Service Provider Risk Management',
    NIST_AI_RMF: 'GOVERN-6.1 — Third-Party AI Risk Management',
  },
  INCIDENT_RESPONSE: {
    GDPR: 'Art. 33/34 — Personal Data Breach Notification',
    DPDP: 'Sec. 8(6) — Data Breach Intimation & Reporting',
    HIPAA: '45 CFR § 164.404 — Breach Notification Rule',
    PCI_DSS: 'Req 12.10 — Incident Response Plan & Recovery',
    NIST_AI_RMF: 'MANAGE-4.1 — Incident Mitigation & Response',
  },
} as const;

export interface ConcernDomainMapping {
  id: string;
  concernDomain: string;
  description: string;
  citations: Record<SupportedFramework, string>;
  frameworkStatuses: Record<SupportedFramework, 'IMPLEMENTED' | 'IN_PROGRESS' | 'NOT_STARTED'>;
  overallStatus: 'implemented' | 'in_progress' | 'not_started';
}

export class FrameworkMapperService {
  /**
   * Domain Concerns Matrix mapping all 5 supported frameworks across 5 core governance domains.
   */
  private static DOMAIN_DEFINITIONS = [
    {
      id: 'domain-data-minimization',
      domain: 'Data Minimization & Storage Scope',
      description: 'Limits data ingestion, persistence, and storage duration across AI and storage layers to the minimum required.',
      citations: CITATIONS.DATA_MINIMIZATION,
    },
    {
      id: 'domain-access-control',
      domain: 'Access Control & Least Privilege',
      description: 'Restricts AI agent execution, API scopes, and database access to authenticated, authorized least-privilege roles.',
      citations: CITATIONS.ACCESS_CONTROL,
    },
    {
      id: 'domain-audit-logging',
      domain: 'Audit Logging & Activity Traceability',
      description: 'Maintains tamper-evident audit trails and telemetry logs for all AI model decisions, tool calls, and data accesses.',
      citations: CITATIONS.AUDIT_LOGGING,
    },
    {
      id: 'domain-third-party-sharing',
      domain: 'Third-Party & Vendor Data Sharing',
      description: 'Enforces strict contractual agreements (BAA/DPA) and data protection boundaries for third-party LLMs and tools.',
      citations: CITATIONS.THIRD_PARTY_SHARING,
    },
    {
      id: 'domain-incident-response',
      domain: 'Incident Response & Breach Notification',
      description: 'Provides real-time runtime detection, automated interception, and immediate escalation workflows for security incidents.',
      citations: CITATIONS.INCIDENT_RESPONSE,
    },
  ];

  /**
   * Computes domain-level cross-framework mapping status for an organization.
   */
  static async getCrossFrameworkMap(organizationId: string): Promise<ConcernDomainMapping[]> {
    const [gdprImpl, dpdpImpl, hipaaImpl, pciImpl, nistImpl] = await Promise.all([
      prisma.controls.findMany({ where: { organizationId, framework: 'GDPR' } }),
      prisma.controls.findMany({ where: { organizationId, framework: 'DPDP' } }),
      prisma.controls.findMany({ where: { organizationId, framework: 'HIPAA' } }),
      prisma.controls.findMany({ where: { organizationId, framework: 'PCI_DSS' } }),
      prisma.nist_ai_rmf_implementations.findMany({ where: { organizationId } }),
    ]);

    const getStatusForFramework = (fw: SupportedFramework): 'IMPLEMENTED' | 'IN_PROGRESS' | 'NOT_STARTED' => {
      switch (fw) {
        case 'GDPR': return gdprImpl.length > 0 ? 'IMPLEMENTED' : 'NOT_STARTED';
        case 'DPDP': return dpdpImpl.length > 0 ? 'IMPLEMENTED' : 'NOT_STARTED';
        case 'HIPAA': return hipaaImpl.length > 0 ? 'IMPLEMENTED' : 'NOT_STARTED';
        case 'PCI_DSS': return pciImpl.length > 0 ? 'IMPLEMENTED' : 'NOT_STARTED';
        case 'NIST_AI_RMF': {
          if (nistImpl.length === 0) return 'NOT_STARTED';
          const implemented = nistImpl.filter(i => i.status === 'IMPLEMENTED').length;
          return implemented > 0 ? 'IMPLEMENTED' : 'IN_PROGRESS';
        }
      }
    };

    return this.DOMAIN_DEFINITIONS.map(def => {
      const frameworkStatuses: Record<SupportedFramework, 'IMPLEMENTED' | 'IN_PROGRESS' | 'NOT_STARTED'> = {
        GDPR: getStatusForFramework('GDPR'),
        DPDP: getStatusForFramework('DPDP'),
        HIPAA: getStatusForFramework('HIPAA'),
        PCI_DSS: getStatusForFramework('PCI_DSS'),
        NIST_AI_RMF: getStatusForFramework('NIST_AI_RMF'),
      };

      const statuses = Object.values(frameworkStatuses);
      const implementedCount = statuses.filter(s => s === 'IMPLEMENTED').length;
      const progressCount = statuses.filter(s => s === 'IN_PROGRESS').length;

      let overallStatus: 'implemented' | 'in_progress' | 'not_started' = 'not_started';
      if (implementedCount === 5) {
        overallStatus = 'implemented';
      } else if (implementedCount > 0 || progressCount > 0) {
        overallStatus = 'in_progress';
      }

      return {
        id: def.id,
        concernDomain: def.domain,
        description: def.description,
        citations: def.citations,
        frameworkStatuses,
        overallStatus,
      };
    });
  }

  /**
   * Identifies compliance gaps where some frameworks are implemented but others remain unaddressed.
   */
  static async getGapAnalysis(organizationId: string) {
    const mappings = await this.getCrossFrameworkMap(organizationId);
    const gaps: any[] = [];

    for (const m of mappings) {
      const implemented = SUPPORTED_FRAMEWORKS.filter(fw => m.frameworkStatuses[fw] === 'IMPLEMENTED');
      const lagging = SUPPORTED_FRAMEWORKS.filter(fw => m.frameworkStatuses[fw] === 'NOT_STARTED');

      if (implemented.length > 0 && lagging.length > 0) {
        for (const lag of lagging) {
          gaps.push({
            domain: m.concernDomain,
            laggingFramework: lag,
            citation: m.citations[lag],
            implementedFramework: implemented[0],
            gapType: 'missing_framework_alignment',
            severity: lagging.length >= 3 ? 'high' : 'medium',
          });
        }
      }
    }

    return gaps;
  }

  /**
   * Calculates overall consistency score across the 5 supported frameworks.
   */
  static async getOverlapScore(organizationId: string) {
    const mappings = await this.getCrossFrameworkMap(organizationId);
    if (mappings.length === 0) return { score: 100, domainScores: [] };

    let totalScore = 0;
    const domainScores = mappings.map(m => {
      const statuses = Object.values(m.frameworkStatuses);
      const implemented = statuses.filter(s => s === 'IMPLEMENTED').length;
      const score = Math.round((implemented / 5) * 100);
      totalScore += score;
      return {
        domain: m.concernDomain,
        score,
      };
    });

    return {
      score: Math.round(totalScore / mappings.length),
      domainScores,
    };
  }
}

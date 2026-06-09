import prisma from '../config/db';
import logger from '../utils/logger';

export interface CrossMapping {
  concern: string;
  domain: 'risk' | 'transparency' | 'data' | 'oversight' | 'audit';
  euAiActCode: string;
  nistCode: string;
  iso42001Code: string;
  iso27001Code: string;
}

export class FrameworkMapperService {
  // Static 15 point cross-framework mapping
  private static MAPPINGS: CrossMapping[] = [
    {
      concern: "Human Oversight",
      domain: "oversight",
      euAiActCode: "EU-AIA-14-1",
      nistCode: "GV-2.1",
      iso42001Code: "ISO-42001-8-3",
      iso27001Code: "ISO-27001-8-1"
    },
    {
      concern: "Data Governance & Quality",
      domain: "data",
      euAiActCode: "EU-AIA-10-1",
      nistCode: "MAP-1.1",
      iso42001Code: "ISO-42001-A10-1",
      iso27001Code: "ISO-27001-A5-2"
    },
    {
      concern: "System Transparency",
      domain: "transparency",
      euAiActCode: "EU-AIA-13-1",
      nistCode: "GV-2.1",
      iso42001Code: "ISO-42001-A11-1",
      iso27001Code: "ISO-27001-A5-1"
    },
    {
      concern: "Risk Management",
      domain: "risk",
      euAiActCode: "EU-AIA-9-1",
      nistCode: "GV-1.1",
      iso42001Code: "ISO-42001-6-1",
      iso27001Code: "ISO-27001-6-1"
    },
    {
      concern: "Incident Response",
      domain: "audit",
      euAiActCode: "EU-AIA-9-1",
      nistCode: "GV-2.1",
      iso42001Code: "ISO-42001-10-1",
      iso27001Code: "ISO-27001-10-1"
    },
    {
      concern: "Access Control Scopes",
      domain: "data",
      euAiActCode: "EU-AIA-10-1",
      nistCode: "MAP-1.1",
      iso42001Code: "ISO-42001-A7-2",
      iso27001Code: "ISO-27001-A8-2"
    },
    {
      concern: "Audit Trail Logging",
      domain: "audit",
      euAiActCode: "EU-AIA-12-1",
      nistCode: "GV-2.1",
      iso42001Code: "ISO-42001-7-3",
      iso27001Code: "ISO-27001-7-3"
    },
    {
      concern: "Staff Safety Training",
      domain: "oversight",
      euAiActCode: "EU-AIA-14-1",
      nistCode: "GV-2.1",
      iso42001Code: "ISO-42001-7-2",
      iso27001Code: "ISO-27001-7-1"
    },
    {
      concern: "Cyber Security & Robustness",
      domain: "risk",
      euAiActCode: "EU-AIA-15-1",
      nistCode: "MAP-1.1",
      iso42001Code: "ISO-42001-A7-1",
      iso27001Code: "ISO-27001-A8-1"
    },
    {
      concern: "Impact Assessments",
      domain: "risk",
      euAiActCode: "EU-AIA-27-1",
      nistCode: "GV-1.1",
      iso42001Code: "ISO-42001-A8-1",
      iso27001Code: "ISO-27001-6-2"
    },
    {
      concern: "Continuous Quality Checks",
      domain: "audit",
      euAiActCode: "EU-AIA-9-1",
      nistCode: "GV-2.1",
      iso42001Code: "ISO-42001-9-1",
      iso27001Code: "ISO-27001-9-1"
    },
    {
      concern: "Management Policy Alignment",
      domain: "transparency",
      euAiActCode: "EU-AIA-13-1",
      nistCode: "GV-1.1",
      iso42001Code: "ISO-42001-5-2",
      iso27001Code: "ISO-27001-5-2"
    },
    {
      concern: "Third Party Governance",
      domain: "risk",
      euAiActCode: "EU-AIA-10-1",
      nistCode: "GV-2.1",
      iso42001Code: "ISO-42001-A13-1",
      iso27001Code: "ISO-27001-A6-1"
    },
    {
      concern: "Data Provenance Lineage",
      domain: "data",
      euAiActCode: "EU-AIA-10-1",
      nistCode: "MAP-1.1",
      iso42001Code: "ISO-42001-A10-2",
      iso27001Code: "ISO-27001-A5-2"
    },
    {
      concern: "Record Keeping & Retention",
      domain: "audit",
      euAiActCode: "EU-AIA-12-1",
      nistCode: "GV-2.1",
      iso42001Code: "ISO-42001-7-3",
      iso27001Code: "ISO-27001-7-3"
    }
  ];

  private static async getRawCrossFrameworkMap(organizationId: string) {
    // Fetch all control implementation statuses across frameworks
    const [euImpl, nistImpl, iso42Impl, iso27Impl] = await Promise.all([
      prisma.eu_ai_act_implementations.findMany({ where: { organizationId }, include: { control: true } }),
      prisma.nist_ai_rmf_implementations.findMany({ where: { organizationId }, include: { subcategory: true } }),
      prisma.iso42001_implementations.findMany({ where: { organizationId }, include: { control: true } }),
      prisma.iso27001_implementations.findMany({ where: { organizationId }, include: { control: true } })
    ]);

    const euMap = new Map(euImpl.map(i => [i.control.control_code, i.status]));
    const nistMap = new Map(nistImpl.map(i => [i.subcategory.subcategory_code, i.status]));
    const iso42Map = new Map(iso42Impl.map(i => [i.control.control_code, i.status]));
    const iso27Map = new Map(iso27Impl.map(i => [i.control.control_code, i.status]));

    return this.MAPPINGS.map(m => {
      const euStatus = euMap.get(m.euAiActCode) || 'NOT_STARTED';
      const nistStatus = nistMap.get(m.nistCode) || 'NOT_STARTED';
      const iso42Status = iso42Map.get(m.iso42001Code) || 'NOT_STARTED';
      const iso27Status = iso27Map.get(m.iso27001Code) || 'NOT_STARTED';

      return {
        concern: m.concern,
        domain: m.domain,
        euAiAct: { code: m.euAiActCode, status: euStatus },
        nist: { code: m.nistCode, status: nistStatus },
        iso42001: { code: m.iso42001Code, status: iso42Status },
        iso27001: { code: m.iso27001Code, status: iso27Status }
      };
    });
  }

  static async getCrossFrameworkMap(organizationId: string) {
    const [rawMap, euControls, nistSubcategories, iso42Controls, iso27Controls] = await Promise.all([
      this.getRawCrossFrameworkMap(organizationId),
      prisma.eu_ai_act_controls.findMany({ select: { control_code: true, title: true } }),
      prisma.nist_ai_rmf_subcategories.findMany({ select: { subcategory_code: true, title: true } }),
      prisma.iso42001_controls.findMany({ select: { control_code: true, title: true } }),
      prisma.iso27001_controls.findMany({ select: { control_code: true, title: true } })
    ]);

    const euTitleMap = new Map(euControls.map(c => [c.control_code, c.title]));
    const nistTitleMap = new Map(nistSubcategories.map(s => [s.subcategory_code, s.title]));
    const iso42TitleMap = new Map(iso42Controls.map(c => [c.control_code, c.title]));
    const iso27TitleMap = new Map(iso27Controls.map(c => [c.control_code, c.title]));

    return rawMap.map(m => {
      const euStatus = m.euAiAct.status;
      const nistStatus = m.nist.status;
      const iso42Status = m.iso42001.status;
      const iso27Status = m.iso27001.status;

      const statuses = [euStatus, nistStatus, iso42Status, iso27Status];
      const implementedCount = statuses.filter(s => s === 'IMPLEMENTED').length;
      const progressCount = statuses.filter(s => s === 'IN_PROGRESS').length;

      let finalStatus: 'implemented' | 'in_progress' | 'not_started' | 'not_applicable' = 'not_started';
      if (implementedCount === 4) {
        finalStatus = 'implemented';
      } else if (implementedCount > 0 || progressCount > 0) {
        finalStatus = 'in_progress';
      }

      const orig = this.MAPPINGS.find(x => x.concern === m.concern)!;

      return {
        id: `${m.domain}-${orig.nistCode}-${orig.euAiActCode}`,
        concernArea: m.concern,
        nistCode: orig.nistCode,
        nistTitle: nistTitleMap.get(orig.nistCode) || "NIST Control",
        euArticle: orig.euAiActCode,
        euTitle: euTitleMap.get(orig.euAiActCode) || "EU AI Act Article",
        iso42001Control: orig.iso42001Code,
        iso42001Title: iso42TitleMap.get(orig.iso42001Code) || "ISO 42001 Control",
        iso27001Control: orig.iso27001Code,
        iso27001Title: iso27TitleMap.get(orig.iso27001Code) || "ISO 27001 Control",
        status: finalStatus
      };
    });
  }

  static async getGapAnalysis(organizationId: string) {
    const [rawMap, euControls, nistSubcategories, iso42Controls, iso27Controls] = await Promise.all([
      this.getRawCrossFrameworkMap(organizationId),
      prisma.eu_ai_act_controls.findMany({ select: { control_code: true, title: true } }),
      prisma.nist_ai_rmf_subcategories.findMany({ select: { subcategory_code: true, title: true } }),
      prisma.iso42001_controls.findMany({ select: { control_code: true, title: true } }),
      prisma.iso27001_controls.findMany({ select: { control_code: true, title: true } })
    ]);

    const euTitleMap = new Map(euControls.map(c => [c.control_code, c.title]));
    const nistTitleMap = new Map(nistSubcategories.map(s => [s.subcategory_code, s.title]));
    const iso42TitleMap = new Map(iso42Controls.map(c => [c.control_code, c.title]));
    const iso27TitleMap = new Map(iso27Controls.map(c => [c.control_code, c.title]));

    const gaps: any[] = [];

    for (const m of rawMap) {
      const euStatus = m.euAiAct.status;
      const nistStatus = m.nist.status;
      const iso42Status = m.iso42001.status;
      const iso27Status = m.iso27001.status;

      const orig = this.MAPPINGS.find(x => x.concern === m.concern)!;

      const frameworks = [
        { name: 'EU AI Act', code: orig.euAiActCode, status: euStatus, title: euTitleMap.get(orig.euAiActCode) || "EU AI Act Article" },
        { name: 'NIST AI RMF', code: orig.nistCode, status: nistStatus, title: nistTitleMap.get(orig.nistCode) || "NIST Control" },
        { name: 'ISO 42001', code: orig.iso42001Code, status: iso42Status, title: iso42TitleMap.get(orig.iso42001Code) || "ISO 42001 Control" },
        { name: 'ISO 27001', code: orig.iso27001Code, status: iso27Status, title: iso27TitleMap.get(orig.iso27001Code) || "ISO 27001 Control" }
      ];

      const implemented = frameworks.filter(f => f.status === 'IMPLEMENTED');
      const lagging = frameworks.filter(f => f.status === 'NOT_STARTED');

      if (implemented.length > 0 && lagging.length > 0) {
        for (const lag of lagging) {
          gaps.push({
            framework: lag.name,
            controlCode: lag.code,
            controlTitle: lag.title,
            mappedFrom: implemented[0].name,
            mappedControl: implemented[0].code,
            gapType: 'missing_implementation',
            severity: lagging.length > 2 ? 'high' : 'medium'
          });
        }
      }
    }

    return gaps;
  }

  static async getOverlapScore(organizationId: string) {
    const fullMap = await this.getRawCrossFrameworkMap(organizationId);
    let totalConsistency = 0;
    const domainScores: Record<string, { total: number; consistent: number }> = {
      risk: { total: 0, consistent: 0 },
      transparency: { total: 0, consistent: 0 },
      data: { total: 0, consistent: 0 },
      oversight: { total: 0, consistent: 0 },
      audit: { total: 0, consistent: 0 }
    };

    fullMap.forEach(m => {
      const statuses = [m.euAiAct.status, m.nist.status, m.iso42001.status, m.iso27001.status];
      
      // Calculate how consistent the implementation is across all 4 frameworks
      const implementedCount = statuses.filter(s => s === 'IMPLEMENTED').length;
      const progressCount = statuses.filter(s => s === 'IN_PROGRESS').length;
      const notStartedCount = statuses.filter(s => s === 'NOT_STARTED').length;

      let score = 0;
      if (implementedCount === 4 || notStartedCount === 4) {
        score = 100; // Consistent state
      } else if (implementedCount > 0 && notStartedCount > 0) {
        // High gap penalty
        score = 40;
      } else if (implementedCount > 0 || progressCount > 0) {
        score = 70;
      }

      totalConsistency += score;

      const domain = m.domain;
      if (domainScores[domain]) {
        domainScores[domain].total += 100;
        domainScores[domain].consistent += score;
      }
    });

    const overallScore = fullMap.length > 0 ? Math.round(totalConsistency / fullMap.length) : 100;
    
    const formattedDomainScores = Object.keys(domainScores).map(k => {
      const d = domainScores[k];
      return {
        domain: k,
        score: d.total > 0 ? Math.round((d.consistent / d.total) * 100) : 100
      };
    });

    return {
      score: overallScore,
      domainScores: formattedDomainScores
    };
  }
}

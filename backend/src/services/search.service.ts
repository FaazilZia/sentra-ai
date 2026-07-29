import prisma from '../config/db';
import logger from '../utils/logger';

export interface SearchResult {
  id: string;
  type: 'agent' | 'policy' | 'risk' | 'incident' | 'compliance' | 'guardrail';
  title: string;
  subtitle?: string;
  url?: string;
}

const STATIC_GUARDRAILS = [
  { id: 'GR-001', name: 'PII Exfiltration Guardrail', description: 'Blocks transfer of personal data to non-whitelisted domains.' },
  { id: 'GR-002', name: 'Prompt Injection Defense', description: 'Detects and neutralizes malicious instruction override strings.' },
  { id: 'GR-003', name: 'Hallucination Mitigation Layer', description: 'Ensures structured response verification against reference knowledge bases.' },
  { id: 'GR-004', name: 'Production Deletion Barrier', description: 'Prevents destructive operations against production databases.' }
];

export class SearchService {
  /**
   * Search across multiple entities for a given query term
   */
  static async search(orgId: string, term: string, limit: number = 5): Promise<SearchResult[]> {
    if (!term || term.trim().length === 0) {
      return [];
    }

    try {
      // Execute parallel DB queries
      const [
        agents,
        policies,
        riskAssessments,
        incidents,
        controls,
        nistSubcategories
      ] = await Promise.all([
        // 1. AI Agents
        prisma.ai_agents.findMany({
          where: {
            organizationId: orgId,
            OR: [
              { name: { contains: term, mode: 'insensitive' } },
              { model: { contains: term, mode: 'insensitive' } },
              { owner: { contains: term, mode: 'insensitive' } }
            ]
          },
          take: limit
        }),

        // 2. Policies
        prisma.policies.findMany({
          where: {
            organizationId: orgId,
            OR: [
              { name: { contains: term, mode: 'insensitive' } },
              { description: { contains: term, mode: 'insensitive' } }
            ]
          },
          take: limit
        }),

        // 3. Risks (Risk Assessments connected to AI Systems)
        prisma.risk_assessments.findMany({
          where: {
            organizationId: orgId,
            OR: [
              { risk_level: { contains: term, mode: 'insensitive' } },
              { status: { contains: term, mode: 'insensitive' } },
              {
                ai_system: {
                  OR: [
                    { name: { contains: term, mode: 'insensitive' } },
                    { description: { contains: term, mode: 'insensitive' } }
                  ]
                }
              }
            ]
          },
          include: { ai_system: true },
          take: limit
        }),

        // 4. Incidents
        prisma.incidents.findMany({
          where: {
            organizationId: orgId,
            OR: [
              { agent_id: { contains: term, mode: 'insensitive' } },
              { action: { contains: term, mode: 'insensitive' } },
              { details: { contains: term, mode: 'insensitive' } }
            ]
          },
          take: limit
        }),

        // 5. Compliance Controls
        prisma.controls.findMany({
          where: {
            organizationId: orgId,
            OR: [
              { framework: { contains: term, mode: 'insensitive' } },
              { control_id: { contains: term, mode: 'insensitive' } },
              { title: { contains: term, mode: 'insensitive' } },
              { description: { contains: term, mode: 'insensitive' } }
            ]
          },
          take: limit
        }),

        // 6. NIST AI RMF Subcategories
        prisma.nist_ai_rmf_subcategories.findMany({
          where: {
            OR: [
              { subcategory_code: { contains: term, mode: 'insensitive' } },
              { title: { contains: term, mode: 'insensitive' } },
              { description: { contains: term, mode: 'insensitive' } }
            ]
          },
          take: limit
        })
      ]);

      const results: SearchResult[] = [];

      // Map AI Agents
      agents.forEach((agent: any) => {
        results.push({
          id: agent.id,
          type: 'agent',
          title: agent.name,
          subtitle: `Model: ${agent.model} • Status: ${agent.status}`,
          url: '/app/inventory'
        });
      });

      // Map Policies
      policies.forEach((policy: any) => {
        results.push({
          id: policy.id,
          type: 'policy',
          title: policy.name,
          subtitle: policy.description,
          url: '/app/policies'
        });
      });

      // Map Risks (Risk Assessments)
      riskAssessments.forEach((risk: any) => {
        results.push({
          id: risk.id,
          type: 'risk',
          title: `Risk Assessment: ${risk.ai_system.name}`,
          subtitle: `Level: ${risk.risk_level} • Status: ${risk.status} (Score: ${risk.score})`,
          url: '/app/risk-assessment'
        });
      });

      // Map Incidents
      incidents.forEach((inc: any) => {
        results.push({
          id: inc.id,
          type: 'incident',
          title: `Incident: ${inc.agent_id} (${inc.action})`,
          subtitle: inc.details,
          url: '/app/risk'
        });
      });

      // Map Compliance Controls
      controls.forEach((ctrl: any) => {
        results.push({
          id: ctrl.id,
          type: 'compliance',
          title: `${ctrl.control_id}: ${ctrl.title}`,
          subtitle: `Framework: ${ctrl.framework} • Category: ${ctrl.category}`,
          url: '/app/controls'
        });
      });

      // Map NIST Subcategories
      nistSubcategories.forEach((sub: any) => {
        results.push({
          id: sub.id,
          type: 'compliance',
          title: `${sub.subcategory_code}: ${sub.title}`,
          subtitle: `Framework: NIST AI RMF • ${sub.description}`,
          url: '/app/controls'
        });
      });

      // 7. Search static guardrails in memory
      STATIC_GUARDRAILS.forEach(gr => {
        const matchesName = gr.name.toLowerCase().includes(term.toLowerCase());
        const matchesDesc = gr.description.toLowerCase().includes(term.toLowerCase());
        const matchesId = gr.id.toLowerCase().includes(term.toLowerCase());
        
        if (matchesName || matchesDesc || matchesId) {
          results.push({
            id: gr.id,
            type: 'guardrail',
            title: `Guardrail: ${gr.name}`,
            subtitle: gr.description,
            url: '/app/guardrails'
          });
        }
      });

      // Sort and slice results to return the requested global limit
      return results.slice(0, limit);

    } catch (error) {
      logger.error('[Search] Cross-query search failed:', error);
      return [];
    }
  }
}

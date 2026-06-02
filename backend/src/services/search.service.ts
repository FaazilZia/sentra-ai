import prisma from '../config/db';
import logger from '../utils/logger';

export interface SearchResult {
  id: string;
  type: 'agent' | 'policy' | 'risk' | 'incident' | 'guardrail' | 'compliance';
  title: string;
  subtitle: string;
  url: string;
}

// Static guardrails definition matching guardrail.service.ts
const STATIC_GUARDRAILS = [
  { id: 'NO_PII_EXPOSURE', name: 'PII Exposure Redaction', description: 'Masks or blocks personal identifiable information (emails, phone numbers, SSNs)' },
  { id: 'NO_PHI_EXPOSURE', name: 'PHI Exposure Prevention', description: 'Blocks health insurance details and patient health records' },
  { id: 'PROMPT_INJECTION_DETECT', name: 'Prompt Injection Detection', description: 'Detects and blocks adversarial prompt injection attempts' },
  { id: 'OS_COMMAND_INJECTION', name: 'OS Command Injection Prevention', description: 'Blocks OS command execution, bash injections, and shell pipelines' },
  { id: 'PATH_TRAVERSAL_DETECT', name: 'Path Traversal Detection', description: 'Blocks directory path traversal attempts (../, /etc/passwd, .env)' },
  { id: 'RISK_ADAPTIVE_CONTROL', name: 'Risk Adaptive Control', description: 'Contextual risk-based blocking of anomalous actions' },
  { id: 'SEMANTIC_ADVERSARIAL_DETECT', name: 'Semantic Adversarial Detection', description: 'Machine learning semantic intent analysis blocking' }
];

export const SearchService = {
  /**
   * Search across multiple models in parallel scoped to the organization
   */
  async searchAll(orgId: string, query: string, limit: number = 20): Promise<SearchResult[]> {
    if (!query || query.trim().length < 2) return [];
    
    const term = query.trim();
    logger.info(`[Search] Querying database for "${term}" in organization ${orgId}`);

    try {
      const [agents, policies, riskAssessments, incidents, controls, dora, ccpa, oecd, ftc] = await Promise.all([
        // 1. AI Agents
        prisma.ai_agents.findMany({
          where: {
            organizationId: orgId,
            OR: [
              { name: { contains: term, mode: 'insensitive' } },
              { model: { contains: term, mode: 'insensitive' } }
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

        // 6. DORA Controls (Global Catalog)
        prisma.dora_controls.findMany({
          where: {
            OR: [
              { control_code: { contains: term, mode: 'insensitive' } },
              { title: { contains: term, mode: 'insensitive' } },
              { description: { contains: term, mode: 'insensitive' } }
            ]
          },
          take: limit
        }),

        // 7. CCPA Controls (Global Catalog)
        prisma.ccpa_controls.findMany({
          where: {
            OR: [
              { control_code: { contains: term, mode: 'insensitive' } },
              { title: { contains: term, mode: 'insensitive' } },
              { description: { contains: term, mode: 'insensitive' } }
            ]
          },
          take: limit
        }),

        // 8. OECD Controls (Global Catalog)
        prisma.oecd_controls.findMany({
          where: {
            OR: [
              { control_code: { contains: term, mode: 'insensitive' } },
              { title: { contains: term, mode: 'insensitive' } },
              { description: { contains: term, mode: 'insensitive' } }
            ]
          },
          take: limit
        }),

        // 9. FTC Controls (Global Catalog)
        prisma.ftc_controls.findMany({
          where: {
            OR: [
              { control_code: { contains: term, mode: 'insensitive' } },
              { title: { contains: term, mode: 'insensitive' } },
              { description: { contains: term, mode: 'insensitive' } }
            ]
          },
          take: limit
        })
      ]);

      const results: SearchResult[] = [];

      // Map AI Agents
      agents.forEach(agent => {
        results.push({
          id: agent.id,
          type: 'agent',
          title: agent.name,
          subtitle: `Model: ${agent.model} • Status: ${agent.status}`,
          url: '/app/inventory'
        });
      });

      // Map Policies
      policies.forEach(policy => {
        results.push({
          id: policy.id,
          type: 'policy',
          title: policy.name,
          subtitle: policy.description,
          url: '/app/policies'
        });
      });

      // Map Risks (Risk Assessments)
      riskAssessments.forEach(risk => {
        results.push({
          id: risk.id,
          type: 'risk',
          title: `Risk Assessment: ${risk.ai_system.name}`,
          subtitle: `Level: ${risk.risk_level} • Status: ${risk.status} (Score: ${risk.score})`,
          url: '/app/risk-assessment'
        });
      });

      // Map Incidents
      incidents.forEach(inc => {
        results.push({
          id: inc.id,
          type: 'incident',
          title: `Incident: ${inc.agent_id} (${inc.action})`,
          subtitle: inc.details,
          url: '/app/risk'
        });
      });

      // Map Compliance Controls
      controls.forEach(ctrl => {
        results.push({
          id: ctrl.id,
          type: 'compliance',
          title: `${ctrl.control_id}: ${ctrl.title}`,
          subtitle: `Framework: ${ctrl.framework} • Category: ${ctrl.category}`,
          url: '/app/controls'
        });
      });

      // Map DORA
      dora.forEach(ctrl => {
        results.push({
          id: ctrl.id,
          type: 'compliance',
          title: `${ctrl.control_code}: ${ctrl.title}`,
          subtitle: `Framework: DORA • ${ctrl.description}`,
          url: '/app/dora'
        });
      });

      // Map CCPA
      ccpa.forEach(ctrl => {
        results.push({
          id: ctrl.id,
          type: 'compliance',
          title: `${ctrl.control_code}: ${ctrl.title}`,
          subtitle: `Framework: CCPA Compliance • ${ctrl.description}`,
          url: '/app/ccpa'
        });
      });

      // Map OECD
      oecd.forEach(ctrl => {
        results.push({
          id: ctrl.id,
          type: 'compliance',
          title: `${ctrl.control_code}: ${ctrl.title}`,
          subtitle: `Framework: OECD AI Principles • ${ctrl.description}`,
          url: '/app/oecd'
        });
      });

      // Map FTC
      ftc.forEach(ctrl => {
        results.push({
          id: ctrl.id,
          type: 'compliance',
          title: `${ctrl.control_code}: ${ctrl.title}`,
          subtitle: `Framework: FTC AI Guidelines • ${ctrl.description}`,
          url: '/app/ftc'
        });
      });

      // 10. Search static guardrails in memory
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

};

import prisma from '../config/db';
import { countComplianceStatuses } from '../utils/complianceCounter';

export class EuAiActService {
  /**
   * Get all articles with their controls and organization's implementation status.
   * Auto-initializes implementations to NOT_STARTED for the organization if any are missing.
   */
  static async getFrameworkOverview(organizationId: string): Promise<{
    articles: Array<{
      article_number: string;
      title: string;
      chapter: string;
      risk_tier: string;
      controls: Array<{
        control_code: string;
        title: string;
        description: string;
        evidence_required: string[];
        checklist_items: string[];
        implementation: {
          status: string;
          notes: string | null;
          owner_user_id: string | null;
          due_date: Date | null;
          evidence_links: any[];
          last_reviewed: Date | null;
        } | null;
      }>;
    }>;
    summary: {
      total_controls: number;
      implemented: number;
      in_progress: number;
      not_started: number;
      not_applicable: number;
      compliance_score: number;
    };
  }> {
    // 1. Ensure all controls have implementations for this organization
    const controls = await prisma.eu_ai_act_controls.findMany();
    const implementations = await prisma.eu_ai_act_implementations.findMany({
      where: { organizationId }
    });

    const implControlIds = new Set(implementations.map(impl => impl.control_id));
    const missingControls = controls.filter(c => !implControlIds.has(c.id));

    if (missingControls.length > 0) {
      await prisma.eu_ai_act_implementations.createMany({
        data: missingControls.map(c => ({
          organizationId,
          control_id: c.id,
          status: 'NOT_STARTED',
          evidence_links: []
        }))
      });
    }

    // 2. Query articles, controls, and their implementations for this organization
    const articles = await prisma.eu_ai_act_articles.findMany({
      where: { is_active: true },
      include: {
        controls: {
          include: {
            implementations: {
              where: { organizationId }
            }
          },
          orderBy: { control_code: 'asc' }
        }
      },
      orderBy: { article_number: 'asc' }
    });

    // 3. Compile count stats
    const allControls = articles.flatMap(art => art.controls);
    const summary = countComplianceStatuses(allControls);

    const formattedArticles = articles.map(art => ({
      article_number: art.article_number,
      title: art.title,
      chapter: art.chapter,
      risk_tier: art.risk_tier,
      controls: art.controls.map(c => {
        const impl = c.implementations[0] || null;
        return {
          control_code: c.control_code,
          title: c.title,
          description: c.description,
          evidence_required: c.evidence_required,
          checklist_items: c.checklist_items,
          implementation: impl
            ? {
                status: impl.status,
                notes: impl.notes,
                owner_user_id: impl.owner_user_id,
                due_date: impl.due_date,
                evidence_links: Array.isArray(impl.evidence_links) ? impl.evidence_links : [],
                last_reviewed: impl.last_reviewed
              }
            : null
        };
      })
    }));

    return { articles: formattedArticles, summary };
  }

  /**
   * Update the organization's implementation status of a specific control.
   */
  static async updateImplementation(
    organizationId: string,
    controlCode: string,
    data: {
      status: string;
      notes?: string;
      owner_user_id?: string;
      due_date?: Date;
      evidence_links?: any[];
    }
  ) {
    const control = await prisma.eu_ai_act_controls.findUnique({
      where: { control_code: controlCode }
    });

    if (!control) {
      throw new Error(`Control not found with code: ${controlCode}`);
    }

    const impl = await prisma.eu_ai_act_implementations.upsert({
      where: {
        organizationId_control_id: {
          organizationId,
          control_id: control.id
        }
      },
      update: {
        status: data.status,
        notes: data.notes !== undefined ? data.notes : undefined,
        owner_user_id: data.owner_user_id !== undefined ? data.owner_user_id : undefined,
        due_date: data.due_date !== undefined ? data.due_date : undefined,
        evidence_links: data.evidence_links !== undefined ? data.evidence_links : undefined,
        last_reviewed: new Date()
      },
      create: {
        organizationId,
        control_id: control.id,
        status: data.status,
        notes: data.notes || null,
        owner_user_id: data.owner_user_id || null,
        due_date: data.due_date || null,
        evidence_links: data.evidence_links || [],
        last_reviewed: new Date()
      }
    });

    // Auto-sync the snapshot
    await this.syncComplianceSnapshot(organizationId);

    return impl;
  }

  /**
   * Get single article details and its controls.
   */
  static async getArticle(organizationId: string, articleNumber: string) {
    const article = await prisma.eu_ai_act_articles.findUnique({
      where: { article_number: articleNumber },
      include: {
        controls: {
          include: {
            implementations: {
              where: { organizationId }
            }
          },
          orderBy: { control_code: 'asc' }
        }
      }
    });

    if (!article) return null;

    return {
      article_number: article.article_number,
      title: article.title,
      chapter: article.chapter,
      risk_tier: article.risk_tier,
      obligation_type: article.obligation_type,
      description: article.description,
      controls: article.controls.map(c => ({
        control_code: c.control_code,
        title: c.title,
        description: c.description,
        evidence_required: c.evidence_required,
        checklist_items: c.checklist_items,
        implementation: c.implementations[0] || null
      }))
    };
  }

  /**
   * Get controls filtered by risk tier.
   */
  static async getControlsByRiskTier(organizationId: string, riskTier: string) {
    const controls = await prisma.eu_ai_act_controls.findMany({
      where: {
        article: {
          risk_tier: riskTier
        }
      },
      include: {
        article: true,
        implementations: {
          where: { organizationId }
        }
      },
      orderBy: { control_code: 'asc' }
    });

    return controls.map(c => ({
      control_code: c.control_code,
      title: c.title,
      description: c.description,
      evidence_required: c.evidence_required,
      checklist_items: c.checklist_items,
      article: {
        article_number: c.article.article_number,
        title: c.article.title,
        risk_tier: c.article.risk_tier
      },
      implementation: c.implementations[0] || null
    }));
  }

  /**
   * Calculate and save the overall score into the compliance_snapshots table.
   */
  static async syncComplianceSnapshot(organizationId: string): Promise<void> {
    const overview = await this.getFrameworkOverview(organizationId);
    const score = overview.summary.compliance_score;

    await prisma.compliance_snapshots.create({
      data: {
        organizationId,
        featureId: 'eu-ai-act',
        gdpr_score: 0,
        dpdp_score: 0,
        hipaa_score: 0,
        eu_ai_act_score: score,
        risk_level: score >= 80 ? 'low' : score >= 50 ? 'medium' : 'high'
      }
    });
  }
}

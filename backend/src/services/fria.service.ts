import prisma from '../config/db';

export const FRIA_QUESTIONS = [
  { code: 'FRIA-1', text: 'Define the intended purpose, scope of deployment, and specific use-cases for the AI system.' },
  { code: 'FRIA-2', text: 'Identify the affected populations, particularly vulnerable groups (e.g., children, historically marginalized groups).' },
  { code: 'FRIA-3', text: 'Document the data sources, their legality, representative traits, and general licensing terms.' },
  { code: 'FRIA-4', text: 'Assess risks of algorithmic discrimination or systematic demographic bias in system decisions.' },
  { code: 'FRIA-5', text: 'Establish specific human oversight mechanisms to intercept or override decisions when necessary.' },
  { code: 'FRIA-6', text: 'Expose model explainability protocols and details on how users are informed of system outputs.' },
  { code: 'FRIA-7', text: 'Provide clear redress mechanisms, recourse forms, and appeal pathways for affected individuals.' },
  { code: 'FRIA-8', text: 'Validate the proportionality and necessity of using an AI system over traditional non-AI methodologies.' },
  { code: 'FRIA-9', text: 'Assess impacts on the right to privacy and personal data protection per GDPR/DPDP rules.' },
  { code: 'FRIA-10', text: 'Assess impacts on the right to non-discrimination and equal treatment.' },
  { code: 'FRIA-11', text: 'Assess impacts on human dignity, respect, and cognitive freedom.' },
  { code: 'FRIA-12', text: 'Assess impacts on the right to a fair trial, due process, and legal representation.' },
  { code: 'FRIA-13', text: 'Assess impacts on freedom of expression, information, assembly, and association.' },
  { code: 'FRIA-14', text: 'Identify potential safety hazards, physical risks, or operational failures under edge scenarios.' },
  { code: 'FRIA-15', text: 'Outline overall security threat models, cybersecurity mitigations, and prompt injection filters.' }
];

export class FriaService {
  /**
   * Create a new FRIA assessment for a given AI System.
   * Auto-seeds the 15 standard questions and updates EU AI Act Art. 27 implementation status to IN_PROGRESS.
   */
  static async createAssessment(organizationId: string, aiSystemId: string) {
    const aiSystem = await prisma.ai_systems.findFirst({
      where: { id: aiSystemId, organizationId }
    });

    if (!aiSystem) {
      throw new Error(`AI System not found or access denied: ${aiSystemId}`);
    }

    const assessment = await prisma.fria_assessments.create({
      data: {
        organizationId,
        ai_system_id: aiSystemId,
        status: 'DRAFT',
      }
    });

    // Seed responses
    await prisma.fria_responses.createMany({
      data: FRIA_QUESTIONS.map(q => ({
        fria_id: assessment.id,
        question_code: q.code,
        question_text: q.text,
        answer: '',
        risk_flag: false,
        notes: ''
      }))
    });

    // Auto-update EU AI Act Art. 27 to IN_PROGRESS
    await this.updateEuAiActControlStatus(organizationId, 'IN_PROGRESS');

    return this.getAssessment(organizationId, assessment.id);
  }

  /**
   * Fetch a specific assessment with all responses.
   */
  static async getAssessment(organizationId: string, assessmentId: string) {
    const assessment = await prisma.fria_assessments.findFirst({
      where: { id: assessmentId, organizationId },
      include: {
        ai_system: true,
        responses: {
          orderBy: { question_code: 'asc' }
        }
      }
    });

    if (!assessment) {
      throw new Error(`FRIA Assessment not found or access denied: ${assessmentId}`);
    }

    return assessment;
  }

  /**
   * List all FRIA assessments for the organization.
   */
  static async listAssessments(organizationId: string) {
    return prisma.fria_assessments.findMany({
      where: { organizationId },
      include: {
        ai_system: {
          select: { id: true, name: true, model_name: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });
  }

  /**
   * Save responses for a FRIA assessment.
   */
  static async saveResponses(
    organizationId: string,
    assessmentId: string,
    responses: Array<{
      question_code: string;
      answer: string;
      risk_flag?: boolean;
      notes?: string;
    }>
  ) {
    // Verify ownership
    const assessment = await prisma.fria_assessments.findFirst({
      where: { id: assessmentId, organizationId }
    });

    if (!assessment) {
      throw new Error(`FRIA Assessment not found or access denied: ${assessmentId}`);
    }

    // Save each response
    for (const resp of responses) {
      await prisma.fria_responses.upsert({
        where: {
          fria_id_question_code: {
            fria_id: assessmentId,
            question_code: resp.question_code
          }
        },
        update: {
          answer: resp.answer,
          risk_flag: resp.risk_flag !== undefined ? resp.risk_flag : undefined,
          notes: resp.notes !== undefined ? resp.notes : undefined
        },
        create: {
          fria_id: assessmentId,
          question_code: resp.question_code,
          question_text: FRIA_QUESTIONS.find(q => q.code === resp.question_code)?.text || '',
          answer: resp.answer,
          risk_flag: resp.risk_flag || false,
          notes: resp.notes || ''
        }
      });
    }

    // Update status to IN_PROGRESS if DRAFT
    if (assessment.status === 'DRAFT') {
      await prisma.fria_assessments.update({
        where: { id: assessmentId },
        data: { status: 'IN_PROGRESS' }
      });
    }

    return this.getAssessment(organizationId, assessmentId);
  }

  /**
   * Complete a FRIA assessment.
   * Sets status to COMPLETED and sets EU AI Act Art. 27 to IMPLEMENTED.
   */
  static async completeAssessment(organizationId: string, assessmentId: string) {
    const assessment = await prisma.fria_assessments.findFirst({
      where: { id: assessmentId, organizationId }
    });

    if (!assessment) {
      throw new Error(`FRIA Assessment not found or access denied: ${assessmentId}`);
    }

    const updated = await prisma.fria_assessments.update({
      where: { id: assessmentId },
      data: { status: 'COMPLETED' },
      include: {
        ai_system: true,
        responses: {
          orderBy: { question_code: 'asc' }
        }
      }
    });

    // Auto-update EU AI Act Art. 27 to IMPLEMENTED
    await this.updateEuAiActControlStatus(organizationId, 'IMPLEMENTED');

    return updated;
  }

  /**
   * Returns whether a complete FRIA assessment exists for the given system.
   */
  static async getComplianceStatus(organizationId: string, aiSystemId: string) {
    const completeAssessment = await prisma.fria_assessments.findFirst({
      where: {
        organizationId,
        ai_system_id: aiSystemId,
        status: 'COMPLETED'
      }
    });

    return {
      is_compliant: !!completeAssessment,
      assessment_id: completeAssessment?.id || null
    };
  }

  /**
   * Helper to set EU AI Act Art. 27 implementation status.
   */
  private static async updateEuAiActControlStatus(organizationId: string, status: 'IN_PROGRESS' | 'IMPLEMENTED') {
    try {
      const control = await prisma.eu_ai_act_controls.findFirst({
        where: { control_code: 'EU-AIA-27-1' }
      });

      if (control) {
        await prisma.eu_ai_act_implementations.upsert({
          where: {
            organizationId_control_id: {
              organizationId,
              control_id: control.id
            }
          },
          update: {
            status,
            last_reviewed: new Date()
          },
          create: {
            organizationId,
            control_id: control.id,
            status,
            evidence_links: [],
            last_reviewed: new Date()
          }
        });
      }
    } catch (err: any) {
      // Gracefully log error (in case seed hasn't run yet)
      console.warn(`[FriaService] Could not auto-update EU AI Act Art. 27 control status:`, err.message);
    }
  }
}

import prisma from '../config/db';
import { randomUUID } from 'crypto';
import { buildTenantQuery } from '../utils/queryHelpers';

export const GovernanceService = {
  // ==========================================
  // RISK ASSESSMENTS
  // ==========================================
  async listRiskAssessments(organizationId: string) {
    return prisma.risk_assessments.findMany({
      ...buildTenantQuery(organizationId),
      include: {
        ai_system: true,
        answers: true
      }
    });
  },

  async getRiskAssessment(id: string, organizationId: string) {
    return prisma.risk_assessments.findFirst({
      where: { id, organizationId },
      include: {
        ai_system: true,
        answers: true
      }
    });
  },

  async createRiskAssessment(organizationId: string, aiSystemId: string) {
    // Verify AI System exists
    const system = await prisma.ai_systems.findFirst({
      where: { id: aiSystemId, organizationId }
    });
    if (!system) {
      throw new Error('AI System not found');
    }

    return prisma.risk_assessments.create({
      data: {
        id: randomUUID(),
        organizationId,
        ai_system_id: aiSystemId,
        score: 0,
        risk_level: 'MEDIUM',
        status: 'DRAFT'
      },
      include: {
        ai_system: true,
        answers: true
      }
    });
  },

  async submitRiskAssessment(
    id: string,
    organizationId: string,
    answers: { question_key: string; answer: string; score: number }[]
  ) {
    const assessment = await prisma.risk_assessments.findFirst({
      where: { id, organizationId }
    });
    if (!assessment) {
      throw new Error('Risk assessment not found');
    }

    // 1. Save answers in transaction
    await prisma.$transaction(
      answers.map((ans) =>
        prisma.risk_assessment_answers.upsert({
          where: {
            risk_assessment_id_question_key: {
              risk_assessment_id: id,
              question_key: ans.question_key
            }
          },
          update: {
            answer: ans.answer,
            score: ans.score
          },
          create: {
            id: randomUUID(),
            risk_assessment_id: id,
            question_key: ans.question_key,
            answer: ans.answer,
            score: ans.score
          }
        })
      )
    );

    // 2. Recalculate score
    const savedAnswers = await prisma.risk_assessment_answers.findMany({
      where: { risk_assessment_id: id }
    });
    const totalScore = savedAnswers.reduce((sum, ans) => sum + ans.score, 0);

    // Score classification
    // 0-30: LOW | 31-60: MEDIUM | 61-80: HIGH | 81-100: CRITICAL
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';
    if (totalScore <= 30) riskLevel = 'LOW';
    else if (totalScore <= 60) riskLevel = 'MEDIUM';
    else if (totalScore <= 80) riskLevel = 'HIGH';
    else riskLevel = 'CRITICAL';

    // 3. Update assessment and corresponding AI System risk tier
    const [updatedAssessment] = await prisma.$transaction([
      prisma.risk_assessments.update({
        where: { id },
        data: {
          score: totalScore,
          risk_level: riskLevel,
          status: 'SUBMITTED',
          updated_at: new Date()
        },
        include: {
          ai_system: true,
          answers: true
        }
      }),
      prisma.ai_systems.update({
        where: { id: assessment.ai_system_id },
        data: {
          risk_tier: riskLevel,
          updated_at: new Date()
        }
      })
    ]);

    return updatedAssessment;
  },

  // ==========================================
  // IMPACT ASSESSMENTS (DPIA / AIA)
  // ==========================================
  async listImpactAssessments(organizationId: string) {
    return prisma.impact_assessments.findMany({
      ...buildTenantQuery(organizationId),
      include: { ai_system: true }
    });
  },

  async createImpactAssessment(
    organizationId: string,
    data: {
      ai_system_id: string;
      type: 'DPIA' | 'AIA';
      form_data: Record<string, any>;
      submitted_by?: string;
    }
  ) {
    const system = await prisma.ai_systems.findFirst({
      where: { id: data.ai_system_id, organizationId }
    });
    if (!system) {
      throw new Error('AI System not found');
    }

    return prisma.impact_assessments.create({
      data: {
        id: randomUUID(),
        organizationId,
        ai_system_id: data.ai_system_id,
        type: data.type,
        status: 'DRAFT',
        form_data: data.form_data,
        submitted_by: data.submitted_by || null
      },
      include: { ai_system: true }
    });
  },

  async updateImpactAssessment(
    id: string,
    organizationId: string,
    data: {
      status?: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';
      form_data?: Record<string, any>;
      reviewed_by?: string;
    }
  ) {
    const updateData: any = { ...data, updated_at: new Date() };
    if (data.status === 'APPROVED') {
      updateData.approved_at = new Date();
    }

    await prisma.impact_assessments.updateMany({
      where: { id, organizationId },
      data: updateData
    });

    return prisma.impact_assessments.findFirst({
      where: { id, organizationId },
      include: { ai_system: true }
    });
  },

  async deleteImpactAssessment(id: string, organizationId: string): Promise<boolean> {
    const res = await prisma.impact_assessments.deleteMany({
      where: { id, organizationId }
    });
    return res.count > 0;
  },

  // ==========================================
  // CONTROLS LIBRARY & IMPLEMENTATIONS
  // ==========================================
  async listControls(organizationId: string) {
    return prisma.controls.findMany({
      where: { organizationId },
      include: {
        control_implementations: true
      },
      orderBy: [{ framework: 'asc' }, { control_id: 'asc' }]
    });
  },

  async createControl(
    organizationId: string,
    data: {
      framework: string;
      control_id: string;
      title: string;
      description: string;
      category: string;
    }
  ) {
    return prisma.controls.create({
      data: {
        id: randomUUID(),
        organizationId,
        framework: data.framework,
        control_id: data.control_id,
        title: data.title,
        description: data.description,
        category: data.category
      }
    });
  },

  async updateControlImplementation(
    organizationId: string,
    controlId: string,
    data: {
      status: 'NOT_STARTED' | 'IN_PROGRESS' | 'IMPLEMENTED' | 'NOT_APPLICABLE';
      evidence?: Record<string, any>[];
      notes?: string;
      owner_user_id?: string;
      due_date?: Date;
    }
  ) {
    // Verify control belongs to this org
    const control = await prisma.controls.findFirst({
      where: { id: controlId, organizationId }
    });
    if (!control) {
      throw new Error('Control not found in this organization');
    }

    return prisma.control_implementations.upsert({
      where: {
        organizationId_control_id: {
          organizationId,
          control_id: controlId
        }
      },
      update: {
        status: data.status,
        evidence: data.evidence ? (data.evidence as any) : undefined,
        notes: data.notes,
        owner_user_id: data.owner_user_id,
        due_date: data.due_date,
        updated_at: new Date()
      },
      create: {
        id: randomUUID(),
        organizationId,
        control_id: controlId,
        status: data.status,
        evidence: data.evidence ? (data.evidence as any) : undefined,
        notes: data.notes,
        owner_user_id: data.owner_user_id,
        due_date: data.due_date
      }
    });
  },

  // ==========================================
  // VENDOR AI TOOLS
  // ==========================================
  async listVendorAiTools(organizationId: string) {
    return prisma.vendor_ai_tools.findMany(buildTenantQuery(organizationId));
  },

  async createVendorAiTool(
    organizationId: string,
    data: {
      vendor_name: string;
      tool_name: string;
      tool_category: string;
      data_shared: Record<string, any>;
      risk_level?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    }
  ) {
    return prisma.vendor_ai_tools.create({
      data: {
        id: randomUUID(),
        organizationId,
        vendor_name: data.vendor_name,
        tool_name: data.tool_name,
        tool_category: data.tool_category,
        data_shared: data.data_shared,
        risk_level: data.risk_level || 'MEDIUM',
        review_status: 'PENDING'
      }
    });
  },

  async reviewVendorAiTool(
    id: string,
    organizationId: string,
    reviewerId: string,
    status: 'APPROVED' | 'FLAGGED'
  ) {
    await prisma.vendor_ai_tools.updateMany({
      where: { id, organizationId },
      data: {
        review_status: status,
        reviewer_id: reviewerId,
        last_reviewed_at: new Date(),
        updated_at: new Date()
      }
    });

    return prisma.vendor_ai_tools.findFirst({
      where: { id, organizationId }
    });
  },

  // ==========================================
  // MODEL CARDS
  // ==========================================
  async getModelCard(aiSystemId: string, organizationId: string) {
    // First, verify system belongs to org
    const system = await prisma.ai_systems.findFirst({
      where: { id: aiSystemId, organizationId }
    });
    if (!system) {
      throw new Error('AI System not found');
    }

    return prisma.model_cards.findUnique({
      where: { ai_system_id: aiSystemId }
    });
  },

  async updateModelCard(
    aiSystemId: string,
    organizationId: string,
    data: {
      intended_use: string;
      out_of_scope_use: string;
      training_data_description: string;
      known_limitations: string;
      bias_considerations: string;
      performance_metrics: Record<string, any>;
      last_updated_by?: string;
      version?: string;
    }
  ) {
    // Verify system belongs to org
    const system = await prisma.ai_systems.findFirst({
      where: { id: aiSystemId, organizationId }
    });
    if (!system) {
      throw new Error('AI System not found');
    }

    return prisma.model_cards.upsert({
      where: { ai_system_id: aiSystemId },
      update: {
        intended_use: data.intended_use,
        out_of_scope_use: data.out_of_scope_use,
        training_data_description: data.training_data_description,
        known_limitations: data.known_limitations,
        bias_considerations: data.bias_considerations,
        performance_metrics: data.performance_metrics,
        last_updated_by: data.last_updated_by || null,
        version: data.version || '1.0.0',
        updated_at: new Date()
      },
      create: {
        id: randomUUID(),
        ai_system_id: aiSystemId,
        intended_use: data.intended_use,
        out_of_scope_use: data.out_of_scope_use,
        training_data_description: data.training_data_description,
        known_limitations: data.known_limitations,
        bias_considerations: data.bias_considerations,
        performance_metrics: data.performance_metrics,
        last_updated_by: data.last_updated_by || null,
        version: data.version || '1.0.0'
      }
    });
  },

  // ==========================================
  // COMPLIANCE OBLIGATIONS
  // ==========================================
  async listObligations(organizationId: string) {
    return prisma.compliance_obligations.findMany({
      where: { organizationId },
      include: {
        control: true
      },
      orderBy: [{ framework: 'asc' }, { article_or_task: 'asc' }]
    });
  },

  async updateObligation(
    id: string,
    organizationId: string,
    data: {
      status?: 'PENDING' | 'IN_PROGRESS' | 'MET' | 'NOT_APPLICABLE';
      owner_user_id?: string;
      deadline?: Date;
      linked_control_id?: string;
    }
  ) {
    // If linked_control_id is supplied, verify it exists under this org
    if (data.linked_control_id) {
      const ctrl = await prisma.controls.findFirst({
        where: { id: data.linked_control_id, organizationId }
      });
      if (!ctrl) {
        throw new Error('Linked control not found in this organization');
      }
    }

    await prisma.compliance_obligations.updateMany({
      where: { id, organizationId },
      data: {
        ...data,
        linked_control_id: data.linked_control_id === '' ? null : data.linked_control_id
      }
    });

    return prisma.compliance_obligations.findFirst({
      where: { id, organizationId },
      include: { control: true }
    });
  }
};

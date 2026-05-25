import prisma from '../config/db';
import logger from '../utils/logger';
import { randomUUID } from 'crypto';
import { IntakeSubmissionStatus } from '@prisma/client';
import { ChangeHistoryService } from './changeHistory.service';
import { NotificationService } from './notification.service';

export async function seedDefaultIntakeForm(orgId: string, tx: any = prisma) {
  try {
    const existing = await tx.intake_forms.findFirst({
      where: { orgId, isActive: true }
    });
    if (!existing) {
      await tx.intake_forms.create({
        data: {
          id: randomUUID(),
          orgId,
          title: 'Standard AI Agent Intake Request',
          description: 'Register a new AI system or agent with the AI safety committee. This form captures agent details, use case description, target departments, and data access requirements to perform an automated risk assessment.',
          fields: [
            {
              name: 'department',
              label: 'Target Department',
              type: 'select',
              required: true,
              options: ['Engineering', 'Product', 'Marketing', 'Sales', 'Customer Support', 'Finance', 'HR', 'Legal', 'Healthcare/Medical Operations', 'Core Research']
            },
            {
              name: 'dataAccess',
              label: 'Data Access Scope',
              type: 'multiselect',
              required: true,
              options: ['PII (Personal Identifiable Information)', 'PCI/Financial Data', 'Medical Records/PHI', 'Internal System Logs', 'Publicly Available Web Data', 'User Authentication Credentials']
            },
            {
              name: 'externalIntegrations',
              label: 'External Integrations',
              type: 'text',
              required: false,
              placeholder: 'e.g. Stripe, Salesforce, Epic EHR, none'
            }
          ],
          isActive: true
        }
      });
      logger.info(`[IntakeFormService] Seeded default intake form for organization ${orgId}`);
    }
  } catch (error) {
    logger.error(`[IntakeFormService] Failed to seed default intake form for org ${orgId}:`, error);
  }
}

export const IntakeFormService = {
  /**
   * Seed defaults for all existing orgs on server startup
   */
  async seedAllExistingOrganizations() {
    try {
      const orgs = await prisma.organizations.findMany();
      for (const org of orgs) {
        await seedDefaultIntakeForm(org.id, prisma);
      }
      logger.info('[IntakeFormService] Dynamic check and seeding of intake forms completed.');
    } catch (error) {
      logger.error('[IntakeFormService] Failed to startup-seed intake forms:', error);
    }
  },

  /**
   * Get active form for organization
   */
  async getActiveForm(orgId: string) {
    // Check if form exists; if not, seed first
    let form = await prisma.intake_forms.findFirst({
      where: { orgId, isActive: true }
    });
    if (!form) {
      await seedDefaultIntakeForm(orgId, prisma);
      form = await prisma.intake_forms.findFirst({
        where: { orgId, isActive: true }
      });
    }
    return form;
  },

  /**
   * Create a new intake submission
   */
  async createSubmission(
    orgId: string,
    userId: string,
    agentName: string,
    agentDescription: string,
    useCase: string,
    formData: any
  ) {
    // 1. Keyword-based risk scoring logic
    const highRiskKeywords = [
      'financial', 'medical', 'ssn', 'personal', 'credit card', 'credentials', 
      'banking', 'identity', 'health', 'phi', 'pii', 'pci', 'biometric', 'social security'
    ];
    const lowRiskKeywords = [
      'internal', 'reporting', 'analytics', 'dashboard', 'testing', 'documentation', 
      'logs', 'summarization', 'static'
    ];

    const contentToAnalyze = `${agentName} ${agentDescription} ${useCase} ${JSON.stringify(formData)}`.toLowerCase();
    
    let score = 'MEDIUM';
    const matchesHigh = highRiskKeywords.some(keyword => contentToAnalyze.includes(keyword));
    const matchesLow = lowRiskKeywords.some(keyword => contentToAnalyze.includes(keyword));

    if (matchesHigh) {
      score = 'HIGH';
    } else if (matchesLow && !matchesHigh) {
      score = 'LOW';
    }

    // Get the active form
    const form = await this.getActiveForm(orgId);
    if (!form) {
      throw new Error('No active intake form configured for this organization.');
    }

    // Create record
    const submission = await prisma.intake_submissions.create({
      data: {
        id: randomUUID(),
        orgId,
        formId: form.id,
        submittedBy: userId,
        agentName,
        agentDescription,
        useCase,
        riskLevel: score,
        status: IntakeSubmissionStatus.pending,
        formData: JSON.parse(JSON.stringify(formData))
      },
      include: {
        submitter: {
          select: { full_name: true, email: true }
        }
      }
    });

    // Notify Org Admins about a new pending intake
    const admins = await prisma.users.findMany({
      where: { organizationId: orgId, role: 'ADMIN', is_active: true }
    });
    for (const admin of admins) {
      await NotificationService.createNotification(
        admin.id,
        orgId,
        'workflow',
        'New AI Intake Submission',
        `A new AI intake form "${agentName}" was submitted for review. Risk level: ${score}.`,
        'workflow',
        submission.id
      );
    }

    // Log in change history
    await ChangeHistoryService.logChange(
      orgId,
      'workflow',
      submission.id,
      userId,
      'created',
      null,
      submission
    );

    // Enqueue intake-llm-score job
    try {
      const { intakeLLMQueue } = require('./queue.service');
      if (intakeLLMQueue) {
        await intakeLLMQueue.add('intake-llm-score', {
          submissionId: submission.id,
          organizationId: orgId
        });
        logger.info(`Enqueued intake-llm-score job for submission: ${submission.id}`);
      } else {
        const { IntakeLLMService } = require('./intakeLLM.service');
        await IntakeLLMService.scoreSubmission(submission.id, orgId);
      }
    } catch (queueErr) {
      logger.error('Failed to enqueue intake LLM score job:', queueErr);
      try {
        const { IntakeLLMService } = require('./intakeLLM.service');
        await IntakeLLMService.scoreSubmission(submission.id, orgId);
      } catch (err) {}
    }

    return submission;
  },

  /**
   * Get list of submissions with filters
   */
  async getSubmissions(orgId: string, status?: IntakeSubmissionStatus) {
    return prisma.intake_submissions.findMany({
      where: {
        orgId,
        ...(status ? { status } : {})
      },
      include: {
        submitter: {
          select: { full_name: true, email: true }
        },
        reviewer: {
          select: { full_name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  },

  /**
   * Approve intake submission & register AI Agent
   */
  async approveSubmission(submissionId: string, reviewerId: string, note?: string) {
    return prisma.$transaction(async (tx) => {
      const submission = await tx.intake_submissions.findUnique({
        where: { id: submissionId }
      });

      if (!submission) {
        throw new Error('Intake submission not found');
      }
      if (submission.status !== IntakeSubmissionStatus.pending) {
        throw new Error(`Cannot approve a submission that is currently ${submission.status}`);
      }

      // 1. Update status
      const updatedSubmission = await tx.intake_submissions.update({
        where: { id: submissionId },
        data: {
          status: IntakeSubmissionStatus.approved,
          reviewedBy: reviewerId,
          reviewNote: note || null
        }
      });

      // 2. Auto-create AI agent in inventory
      const newSystemId = randomUUID();
      const newSystem = await tx.ai_systems.create({
        data: {
          id: newSystemId,
          organizationId: submission.orgId,
          name: submission.agentName,
          description: submission.agentDescription,
          model_name: 'gpt-4o', // Default
          model_version: '1.0.0', // Default
          vendor: 'OpenAI', // Default
          use_case: submission.useCase,
          risk_tier: submission.riskLevel === 'HIGH' ? 'HIGH' : submission.riskLevel === 'LOW' ? 'LOW' : 'MEDIUM',
          owner_user_id: submission.submittedBy,
          status: 'ACTIVE'
        }
      });

      // 3. Log History of Workflow transition
      await ChangeHistoryService.logChange(
        submission.orgId,
        'workflow',
        submissionId,
        reviewerId,
        'status_changed',
        { status: 'pending' },
        { status: 'approved' },
        `Intake request approved. Registered new AI System: ${submission.agentName} (${newSystemId})`
      );

      // 4. Log creation of new system
      await ChangeHistoryService.logChange(
        submission.orgId,
        'agent',
        newSystemId,
        reviewerId,
        'created',
        null,
        newSystem,
        `AI System registered from approved intake request (${submissionId})`
      );

      // 5. Send notifications
      await NotificationService.createNotification(
        submission.submittedBy,
        submission.orgId,
        'workflow',
        'Intake Submission Approved',
        `Your AI intake request for "${submission.agentName}" has been approved and registered as an active system.`,
        'agent',
        newSystemId
      );

      return { submission: updatedSubmission, system: newSystem };
    });
  },

  /**
   * Reject intake submission
   */
  async rejectSubmission(submissionId: string, reviewerId: string, note?: string) {
    const submission = await prisma.intake_submissions.findUnique({
      where: { id: submissionId }
    });

    if (!submission) {
      throw new Error('Intake submission not found');
    }
    if (submission.status !== IntakeSubmissionStatus.pending) {
      throw new Error(`Cannot reject a submission that is currently ${submission.status}`);
    }

    const updatedSubmission = await prisma.intake_submissions.update({
      where: { id: submissionId },
      data: {
        status: IntakeSubmissionStatus.rejected,
        reviewedBy: reviewerId,
        reviewNote: note || null
      }
    });

    // Log History of Workflow transition
    await ChangeHistoryService.logChange(
      submission.orgId,
      'workflow',
      submissionId,
      reviewerId,
      'status_changed',
      { status: 'pending' },
      { status: 'rejected' },
      `Intake request rejected. Reason: ${note || 'None'}`
    );

    // Notify submitter
    await NotificationService.createNotification(
      submission.submittedBy,
      submission.orgId,
      'workflow',
      'Intake Submission Rejected',
      `Your AI intake request for "${submission.agentName}" was rejected. Reviewer notes: ${note || 'No reason provided.'}`,
      'workflow',
      submissionId
    );

    return updatedSubmission;
  }
};

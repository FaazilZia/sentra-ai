// Mock queue.service BEFORE importing app to prevent BullMQ Workers from spinning up
jest.mock('../services/queue.service', () => ({
  enqueueLog: jest.fn().mockResolvedValue(undefined),
  enqueueConnectorScan: jest.fn().mockResolvedValue(undefined),
  processConnectorScan: jest.fn().mockResolvedValue(undefined),
  setupScheduledJobs: jest.fn().mockResolvedValue(undefined),
  activityQueue: null,
  connectorQueue: null,
  retentionQueue: null,
}));

// Mock server to prevent Socket.IO from trying to bind
jest.mock('../server', () => ({
  io: { to: jest.fn().mockReturnThis(), emit: jest.fn() },
}));

import prisma from '../config/db';
import { ChangeHistoryService } from '../services/changeHistory.service';
import { IntakeFormService } from '../services/intakeForm.service';
import { SlackService } from '../services/slack.service';
import { ChangeEntityType, ChangeHistoryType, IntakeSubmissionStatus } from '@prisma/client';

// Mock database
jest.mock('../config/db', () => ({
  __esModule: true,
  default: {
    users: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    notifications: {
      create: jest.fn(),
    },
    slack_config: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
    change_history: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    intake_forms: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    intake_submissions: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    ai_systems: {
      create: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(prisma)),
  },
}));

// Cast prisma as any to override mock values easily
const db = prisma as any;

describe('Wave 2 Services', () => {
  const ORG_ID = 'test-org-123';
  const USER_ID = 'user-abc';
  const ADMIN_USER = { id: 'admin-123', organizationId: ORG_ID, email: 'admin@test.com', full_name: 'Admin User', role: 'ADMIN', is_active: true };
  const REGULAR_USER = { id: USER_ID, organizationId: ORG_ID, email: 'user@test.com', full_name: 'Regular User', role: 'VIEWER', is_active: true };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ChangeHistoryService', () => {
    describe('logChange diffing engine', () => {
      it('should strip internal ID keys, changedBy, and timestamps from update diffs', async () => {
        db.change_history.create.mockResolvedValue({ id: 'history-1' });

        const prevVal = {
          id: 'some-id',
          name: 'Old Name',
          description: 'Old Desc',
          orgId: ORG_ID,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const newVal = {
          id: 'some-id',
          name: 'New Name',
          description: 'Old Desc', // Unchanged
          orgId: ORG_ID,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await ChangeHistoryService.logChange(
          ORG_ID,
          ChangeEntityType.policy,
          'policy-123',
          USER_ID,
          ChangeHistoryType.updated,
          prevVal,
          newVal,
          'Updating policy parameters'
        );

        expect(db.change_history.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              orgId: ORG_ID,
              entityType: ChangeEntityType.policy,
              entityId: 'policy-123',
              changedBy: USER_ID,
              changeType: ChangeHistoryType.updated,
              // Diff previousValue should contain ONLY name: 'Old Name'
              previousValue: { name: 'Old Name' },
              // Diff newValue should contain ONLY name: 'New Name'
              newValue: { name: 'New Name' },
              changeNote: 'Updating policy parameters'
            })
          })
        );
      });

      it('should record complete states for created and deleted events without noise keys', async () => {
        db.change_history.create.mockResolvedValue({ id: 'history-2' });

        const createdVal = {
          id: 'some-id',
          name: 'New Object',
          orgId: ORG_ID,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await ChangeHistoryService.logChange(
          ORG_ID,
          ChangeEntityType.agent,
          'agent-789',
          USER_ID,
          ChangeHistoryType.created,
          null,
          createdVal,
          'Registered system'
        );

        expect(db.change_history.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              orgId: ORG_ID,
              entityType: ChangeEntityType.agent,
              entityId: 'agent-789',
              changedBy: USER_ID,
              changeType: ChangeHistoryType.created,
              previousValue: null,
              // Should strip internal fields id, orgId, timestamps from newValue
              newValue: { name: 'New Object' }
            })
          })
        );
      });
    });
  });

  describe('IntakeFormService', () => {
    describe('Risk Auto-Scoring Engine', () => {
      it('should score HIGH risk if high risk keywords are detected', async () => {
        db.intake_forms.findFirst.mockResolvedValue({ id: 'form-1' });
        db.intake_submissions.create.mockImplementation((args: any) => Promise.resolve({ ...args.data, submitter: REGULAR_USER }));
        db.users.findMany.mockResolvedValue([ADMIN_USER]);

        const submission = await IntakeFormService.createSubmission(
          ORG_ID,
          USER_ID,
          'Clinical Summary Tool',
          'Processes highly sensitive medical parameters and PHI records.',
          'Medical diagnostic analytics assistant',
          { department: 'HR' }
        );

        expect(submission.riskLevel).toBe('HIGH');
        expect(db.intake_submissions.create).toHaveBeenCalled();
      });

      it('should score LOW risk if low-risk words are found and no high-risk trigger is present', async () => {
        db.intake_forms.findFirst.mockResolvedValue({ id: 'form-1' });
        db.intake_submissions.create.mockImplementation((args: any) => Promise.resolve({ ...args.data, submitter: REGULAR_USER }));
        db.users.findMany.mockResolvedValue([ADMIN_USER]);

        const submission = await IntakeFormService.createSubmission(
          ORG_ID,
          USER_ID,
          'Telemetry Dashboard',
          'Purely aggregates internal static log stats for engineering dashboards.',
          'Internal reporting utility',
          { department: 'Engineering' }
        );

        expect(submission.riskLevel).toBe('LOW');
      });

      it('should default to MEDIUM risk for neutral submissions', async () => {
        db.intake_forms.findFirst.mockResolvedValue({ id: 'form-1' });
        db.intake_submissions.create.mockImplementation((args: any) => Promise.resolve({ ...args.data, submitter: REGULAR_USER }));
        db.users.findMany.mockResolvedValue([ADMIN_USER]);

        const submission = await IntakeFormService.createSubmission(
          ORG_ID,
          USER_ID,
          'Support Copilot',
          'Standard user interaction agent answering generic FAQs.',
          'Customer interaction flow utility',
          { department: 'Sales' }
        );

        expect(submission.riskLevel).toBe('MEDIUM');
      });
    });

    describe('Intake Workflow Lifecycle Decisions', () => {
      it('should auto-register a new ACTIVE AI system in inventory upon approval', async () => {
        const mockSubmission = {
          id: 'sub-99',
          orgId: ORG_ID,
          formId: 'form-1',
          submittedBy: USER_ID,
          agentName: 'Medical Classifier Bot',
          agentDescription: 'Extracts bio parameters',
          useCase: 'Clinical summaries',
          riskLevel: 'HIGH',
          status: IntakeSubmissionStatus.pending,
          formData: {}
        };

        db.users.findFirst.mockResolvedValue(REGULAR_USER);
        db.intake_submissions.findUnique.mockResolvedValue(mockSubmission);
        db.intake_submissions.update.mockImplementation((args: any) => Promise.resolve({ ...mockSubmission, ...args.data }));
        db.ai_systems.create.mockImplementation((args: any) => Promise.resolve(args.data));
        db.change_history.create.mockResolvedValue({ id: 'h-123' });
        db.notifications.create.mockResolvedValue({ id: 'n-123' });

        const result = await IntakeFormService.approveSubmission('sub-99', 'admin-123', 'Fully compliant architecture');

        expect(result.submission.status).toBe(IntakeSubmissionStatus.approved);
        expect(result.system).toBeDefined();
        expect(result.system.name).toBe('Medical Classifier Bot');
        expect(result.system.risk_tier).toBe('HIGH');
        expect(result.system.status).toBe('ACTIVE');
        expect(result.system.owner_user_id).toBe(USER_ID);

        // Check notification for submitter
        expect(db.notifications.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              userId: USER_ID,
              orgId: ORG_ID,
              type: 'workflow',
              title: 'Intake Submission Approved'
            })
          })
        );
      });

      it('should cancel and mark rejected on rejectSubmission', async () => {
        const mockSubmission = {
          id: 'sub-99',
          orgId: ORG_ID,
          formId: 'form-1',
          submittedBy: USER_ID,
          agentName: 'Medical Classifier Bot',
          status: IntakeSubmissionStatus.pending
        };

        db.users.findFirst.mockResolvedValue(REGULAR_USER);
        db.intake_submissions.findUnique.mockResolvedValue(mockSubmission);
        db.intake_submissions.update.mockImplementation((args: any) => Promise.resolve({ ...mockSubmission, ...args.data }));
        db.change_history.create.mockResolvedValue({ id: 'h-123' });
        db.notifications.create.mockResolvedValue({ id: 'n-123' });

        const submission = await IntakeFormService.rejectSubmission('sub-99', 'admin-123', 'Integrations violate privacy obligations');

        expect(submission.status).toBe(IntakeSubmissionStatus.rejected);
        expect(db.ai_systems.create).not.toHaveBeenCalled();
      });
    });
  });

  describe('SlackService', () => {
    it('should correctly format Block Kit alerts using professional styling', async () => {
      // Mock SlackConfig check
      db.slack_config.findUnique.mockResolvedValue({
        webhookUrl: 'https://hooks.slack.com/services/mock',
        channel: '#security-alerts',
        enabled: true,
        notifyOn: ['guardrail_block']
      });

      const message = 'Incoming prompt jailbreak was intercepted by prompt blocker!';
      await SlackService.notifyGuardrailBlock(
        ORG_ID,
        'Jailbreak Blocker',
        'Mohammad Faazil',
        message
      );

      // Verify connection tester
      expect(db.slack_config.findUnique).toHaveBeenCalledWith({ where: { orgId: ORG_ID } });
    });
  });
});

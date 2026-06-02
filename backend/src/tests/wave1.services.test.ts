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
import { NotificationService } from '../services/notification.service';
import { EvidenceService } from '../services/evidence.service';
import { SearchService } from '../services/search.service';
import { NotificationType, EvidenceType } from '@prisma/client';

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
      findMany: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
    },
    evidence: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
    ai_agents: {
      findMany: jest.fn(),
    },
    policies: {
      findMany: jest.fn(),
    },
    risk_assessments: {
      findMany: jest.fn(),
    },
    incidents: {
      findMany: jest.fn(),
    },
    controls: {
      findMany: jest.fn(),
    },
    ccpa_controls: {
      findMany: jest.fn(),
    },
    dora_controls: {
      findMany: jest.fn(),
    },
    oecd_controls: {
      findMany: jest.fn(),
    },
    ftc_controls: {
      findMany: jest.fn(),
    },
  },
}));

// Cast prisma as any to override mock values easily
const db = prisma as any;

describe('Wave 1 Services', () => {
  const ORG_ID = 'test-org-123';
  const USER_ID = '12345678-1234-1234-1234-123456789012';
  const ADMIN_USER = { id: 'admin-123', organizationId: ORG_ID, email: 'admin@test.com', full_name: 'Admin User', role: 'ADMIN', is_active: true };
  const REGULAR_USER = { id: USER_ID, organizationId: ORG_ID, email: 'user@test.com', full_name: 'Regular User', role: 'VIEWER', is_active: true };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('NotificationService', () => {
    describe('createNotification', () => {
      it('should create notification if user exists in the org', async () => {
        db.users.findFirst.mockResolvedValue(REGULAR_USER);
        db.notifications.create.mockResolvedValue({ id: 'notif-1', title: 'Test' });

        const result = await NotificationService.createNotification(
          USER_ID,
          ORG_ID,
          NotificationType.alert,
          'Test Alert',
          'This is a message'
        );

        expect(db.users.findFirst).toHaveBeenCalledWith({
          where: { id: USER_ID, organizationId: ORG_ID },
        });
        expect(db.notifications.create).toHaveBeenCalled();
        expect(result).toHaveProperty('id');
      });

      it('should skip notification if user does not belong to the org', async () => {
        db.users.findFirst.mockResolvedValue(null);

        const result = await NotificationService.createNotification(
          USER_ID,
          ORG_ID,
          NotificationType.alert,
          'Test Alert',
          'This is a message'
        );

        expect(result).toBeNull();
        expect(db.notifications.create).not.toHaveBeenCalled();
      });
    });

    describe('notifyGuardrailBlock', () => {
      it('should notify triggering user and org admins', async () => {
        // Triggering user + admin
        db.users.findFirst.mockResolvedValue(REGULAR_USER);
        db.users.findMany.mockResolvedValue([ADMIN_USER]);
        db.notifications.create.mockImplementation((args: any) => Promise.resolve({ id: args.data.userId }));

        const result = await NotificationService.notifyGuardrailBlock(
          ORG_ID,
          USER_ID,
          'Guardrail Blocked',
          'Action was intercepted'
        );

        expect(result).toHaveLength(2); // triggering user + admin
        expect(result.map(n => n.id)).toContain(USER_ID);
        expect(result.map(n => n.id)).toContain('admin-123');
      });
    });

    describe('notifyDriftDetected', () => {
      it('should notify org admins only', async () => {
        db.users.findFirst.mockResolvedValue(ADMIN_USER);
        db.users.findMany.mockResolvedValue([ADMIN_USER]);
        db.notifications.create.mockImplementation((args: any) => Promise.resolve({ id: args.data.userId }));

        const result = await NotificationService.notifyDriftDetected(
          ORG_ID,
          'Drift Alert',
          'Data drift found'
        );

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('admin-123');
      });
    });

    describe('notifyIncidentCreated', () => {
      it('should notify org admins only', async () => {
        db.users.findFirst.mockResolvedValue(ADMIN_USER);
        db.users.findMany.mockResolvedValue([ADMIN_USER]);
        db.notifications.create.mockImplementation((args: any) => Promise.resolve({ id: args.data.userId }));

        const result = await NotificationService.notifyIncidentCreated(
          ORG_ID,
          'Incident Alert',
          'Security issue identified'
        );

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('admin-123');
      });
    });

    describe('notifyWorkflowTransition', () => {
      it('should notify assignee and creator only', async () => {
        const creatorId = 'creator-999';
        const assigneeId = 'assignee-888';

        db.users.findFirst.mockImplementation(({ where }: any) => {
          return Promise.resolve({ id: where.id, organizationId: ORG_ID });
        });
        db.notifications.create.mockImplementation((args: any) => Promise.resolve({ id: args.data.userId }));

        const result = await NotificationService.notifyWorkflowTransition(
          ORG_ID,
          assigneeId,
          creatorId,
          'State transition',
          'Status changed'
        );

        expect(result).toHaveLength(2);
        expect(result.map(n => n.id)).toContain(creatorId);
        expect(result.map(n => n.id)).toContain(assigneeId);
      });
    });

    describe('getNotificationsForUser', () => {
      it('should return paginated user notifications', async () => {
        db.notifications.findMany.mockResolvedValue([{ id: 'n-1' }]);
        db.notifications.count.mockResolvedValue(1);

        const result = await NotificationService.getNotificationsForUser(USER_ID, ORG_ID, 1, 10);
        expect(result.notifications).toHaveLength(1);
        expect(result.total).toBe(1);
        expect(result.totalPages).toBe(1);
      });
    });

    describe('markAllAsRead', () => {
      it('should trigger updateMany correctly', async () => {
        db.notifications.updateMany.mockResolvedValue({ count: 5 });
        await NotificationService.markAllAsRead(USER_ID, ORG_ID);
        expect(db.notifications.updateMany).toHaveBeenCalledWith({
          where: { userId: USER_ID, orgId: ORG_ID, isRead: false },
          data: { isRead: true },
        });
      });
    });
  });

  describe('EvidenceService', () => {
    const mockFile = {
      originalname: 'policy_doc.pdf',
      size: 1024,
      mimetype: 'application/pdf',
      buffer: Buffer.from('PDF Content Mock'),
    };

    const mockMetadata = {
      title: 'Policy Evidence',
      description: 'Proof of review',
      entityType: EvidenceType.policy,
      entityId: 'policy-abc',
      tags: ['audit', 'policy'],
    };

    describe('uploadEvidence', () => {
      it('should upload local evidence correctly', async () => {
        db.evidence.create.mockResolvedValue({ id: 'ev-123', fileUrl: '/uploads/ev-123.pdf' });

        const result = await EvidenceService.uploadEvidence(mockFile, mockMetadata, ORG_ID, USER_ID);

        expect(db.evidence.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              orgId: ORG_ID,
              uploadedBy: USER_ID,
              title: mockMetadata.title,
              fileName: mockFile.originalname,
              fileSize: mockFile.size,
              mimeType: mockFile.mimetype,
              entityType: mockMetadata.entityType,
              entityId: mockMetadata.entityId,
            }),
          })
        );
        expect(result).toHaveProperty('fileUrl');
      });
    });

    describe('getEvidenceForEntity', () => {
      it('should search for correct entity', async () => {
        db.evidence.findMany.mockResolvedValue([]);
        await EvidenceService.getEvidenceForEntity(EvidenceType.policy, 'policy-abc', ORG_ID);

        expect(db.evidence.findMany).toHaveBeenCalledWith({
          where: { orgId: ORG_ID, entityType: EvidenceType.policy, entityId: 'policy-abc' },
          include: { user: { select: { full_name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
        });
      });
    });

    describe('deleteEvidence', () => {
      it('should delete record from database', async () => {
        db.evidence.findFirst.mockResolvedValue({ id: 'ev-123', fileUrl: '/uploads/ev-123.pdf' });
        db.evidence.delete.mockResolvedValue({ id: 'ev-123' });

        await EvidenceService.deleteEvidence('ev-123', ORG_ID);

        expect(db.evidence.delete).toHaveBeenCalledWith({
          where: { id: 'ev-123' },
        });
      });
    });
  });

  describe('SearchService', () => {
    describe('searchAll', () => {
      it('should query multiple tables matching search query', async () => {
        db.ai_agents.findMany.mockResolvedValue([{ id: 'a1', name: 'Sales Agent', model: 'gpt-4', status: 'active' }]);
        db.policies.findMany.mockResolvedValue([{ id: 'p1', name: 'HIPAA Policy', description: 'HIPAA rule compliance description' }]);
        db.risk_assessments.findMany.mockResolvedValue([{
          id: 'r1',
          risk_level: 'High',
          status: 'Open',
          score: 85,
          ai_system: { name: 'Customer Chatbot', description: 'Internal agent chatbot' }
        }]);
        db.incidents.findMany.mockResolvedValue([{ id: 'i1', agent_id: 'chat-agent', action: 'write_db', details: 'Unauthorized db access write details' }]);
        db.controls.findMany.mockResolvedValue([{ id: 'c1', control_id: 'AC-1', title: 'Access Control', framework: 'NIST', category: 'Security' }]);
        db.ccpa_controls.findMany.mockResolvedValue([{ id: 'ccpa-1', control_code: 'CCPA-1.1', title: 'Data Privacy Right', description: 'Consumer rights under CCPA' }]);
        db.dora_controls.findMany.mockResolvedValue([{ id: 'dora-1', control_code: 'DORA-1.1', title: 'Risk Governance', description: 'Financial resilience risk mapping' }]);
        db.oecd_controls.findMany.mockResolvedValue([{ id: 'oecd-1', control_code: 'OECD-1', title: 'Fairness Principle', description: 'Fairness and safety in AI models' }]);
        db.ftc_controls.findMany.mockResolvedValue([{ id: 'ftc-1', control_code: 'FTC-1', title: 'Deceptive AI Claims', description: 'Prevention of unfair practices' }]);

        const results = await SearchService.searchAll(ORG_ID, 'injection');

        expect(results.length).toBeGreaterThan(0);
        
        const incidentMatch = results.find(r => r.type === 'incident');
        expect(incidentMatch).toBeDefined();
        expect(incidentMatch?.title).toBe('Incident: chat-agent (write_db)');

        const grMatch = results.find(r => r.type === 'guardrail' && r.title.includes('Injection'));
        expect(grMatch).toBeDefined();

        const ccpaMatch = results.find(r => r.type === 'compliance' && r.title.includes('CCPA-1.1'));
        expect(ccpaMatch).toBeDefined();
        expect(ccpaMatch?.url).toBe('/app/ccpa');

        const doraMatch = results.find(r => r.type === 'compliance' && r.title.includes('DORA-1.1'));
        expect(doraMatch).toBeDefined();
        expect(doraMatch?.url).toBe('/app/dora');
      });

      it('should return empty array for very short query', async () => {
        const results = await SearchService.searchAll(ORG_ID, 'a');
        expect(results).toHaveLength(0);
      });
    });
  });
});

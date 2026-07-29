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
import { GdprService } from '../services/gdpr.service';
import { HipaaService } from '../services/hipaa.service';
import { PciService } from '../services/pci.service';
import { DpdpService } from '../services/dpdp.service';
import { logActivity } from '../services/policy.service';

// Mock database
jest.mock('../config/db', () => ({
  __esModule: true,
  default: {
    gdpr_chapters: {
      findMany: jest.fn(),
    },
    gdpr_controls: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    hipaaChapter: {
      findMany: jest.fn(),
    },
    hipaaControl: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    pciControl: {
      findMany: jest.fn(),
    },
    dpdpControl: {
      findMany: jest.fn(),
    },
    activity_logs: {
      create: jest.fn(),
    },
    logs: {
      create: jest.fn(),
    },
    compliance_snapshots: {
      create: jest.fn().mockResolvedValue({}),
    },
  },
}));

const db = prisma as any;

describe('Wave 3 Smoke Test Suite', () => {
  const ORG_ID = 'test-org-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GdprService', () => {
    it('getChapters — assert array length 2', async () => {
      const mockChapters = [
        { id: '1', chapterNumber: '1', title: 'Chapter 1', description: 'desc 1' },
        { id: '2', chapterNumber: '2', title: 'Chapter 2', description: 'desc 2' },
      ];
      db.gdpr_chapters.findMany.mockResolvedValue(mockChapters);

      const result = await GdprService.getChapters(ORG_ID);
      expect(db.gdpr_chapters.findMany).toHaveBeenCalledWith({
        where: { organizationId: ORG_ID },
        orderBy: { chapterNumber: 'asc' },
      });
      expect(result).toHaveLength(2);
    });

    it('getStats — assert compliance_score equals 63, total_controls equals 4', async () => {
      const mockControls = [
        { id: 'c1', status: 'IMPLEMENTED' },
        { id: 'c2', status: 'IMPLEMENTED' },
        { id: 'c3', status: 'IN_PROGRESS' },
        { id: 'c4', status: 'NOT_STARTED' },
      ];
      db.gdpr_controls.findMany.mockResolvedValue(mockControls);

      const stats = await GdprService.getStats(ORG_ID);
      expect(db.gdpr_controls.findMany).toHaveBeenCalledWith({
        where: { organizationId: ORG_ID },
      });
      expect(stats.total_controls).toBe(4);
      expect(stats.compliance_score).toBe(63);
    });

    it('updateControl — assert update called with correct status', async () => {
      const mockControl = { id: 'ctrl-123', organizationId: ORG_ID, status: 'NOT_STARTED' };
      db.gdpr_controls.findFirst.mockResolvedValue(mockControl);
      db.gdpr_controls.update.mockResolvedValue({ ...mockControl, status: 'IMPLEMENTED' });
      db.gdpr_controls.findMany.mockResolvedValue([
        { id: 'ctrl-123', status: 'IMPLEMENTED' }
      ]);

      const result = await GdprService.updateControl(ORG_ID, 'ctrl-123', { status: 'IMPLEMENTED', notes: 'updated' });
      expect(db.gdpr_controls.findFirst).toHaveBeenCalledWith({
        where: { id: 'ctrl-123', organizationId: ORG_ID },
      });
      expect(db.gdpr_controls.update).toHaveBeenCalledWith({
        where: { id: 'ctrl-123' },
        data: { status: 'IMPLEMENTED', notes: 'updated' },
      });
      expect(result.status).toBe('IMPLEMENTED');
    });
  });

  describe('HipaaService', () => {
    it('getChapters — assert array length 3', async () => {
      const mockChapters = [
        { id: '1', chapterNumber: '1', title: 'Chapter 1' },
        { id: '2', chapterNumber: '2', title: 'Chapter 2' },
        { id: '3', chapterNumber: '3', title: 'Chapter 3' },
      ];
      db.hipaaChapter.findMany.mockResolvedValue(mockChapters);

      const result = await HipaaService.getChapters(ORG_ID);
      expect(db.hipaaChapter.findMany).toHaveBeenCalledWith({
        where: { organizationId: ORG_ID },
        orderBy: { chapterNumber: 'asc' },
      });
      expect(result).toHaveLength(3);
    });

    it('getStats — assert compliance_score equals 0', async () => {
      const mockControls = [
        { id: 'c1', status: 'NOT_STARTED' },
        { id: 'c2', status: 'NOT_STARTED' },
        { id: 'c3', status: 'NOT_STARTED' },
        { id: 'c4', status: 'NOT_STARTED' },
        { id: 'c5', status: 'NOT_STARTED' },
      ];
      db.hipaaControl.findMany.mockResolvedValue(mockControls);

      const stats = await HipaaService.getStats(ORG_ID);
      expect(db.hipaaControl.findMany).toHaveBeenCalledWith({
        where: { organizationId: ORG_ID },
      });
      expect(stats.compliance_score).toBe(0);
    });

    it('updateControl — assert update called', async () => {
      const mockControl = { id: 'ctrl-123', organizationId: ORG_ID, status: 'NOT_STARTED' };
      db.hipaaControl.findFirst.mockResolvedValue(mockControl);
      db.hipaaControl.update.mockResolvedValue({ ...mockControl, status: 'IN_PROGRESS' });
      db.hipaaControl.findMany.mockResolvedValue([
        { id: 'ctrl-123', status: 'IN_PROGRESS' }
      ]);

      const result = await HipaaService.updateControl(ORG_ID, 'ctrl-123', { status: 'IN_PROGRESS' });
      expect(db.hipaaControl.findFirst).toHaveBeenCalledWith({
        where: { id: 'ctrl-123', organizationId: ORG_ID },
      });
      expect(db.hipaaControl.update).toHaveBeenCalled();
      expect(result.status).toBe('IN_PROGRESS');
    });
  });



  describe('PciService', () => {
    it('getStats — assert compliance_score equals 67', async () => {
      const mockControls = [
        { id: 'c1', status: 'IMPLEMENTED' },
        { id: 'c2', status: 'NOT_APPLICABLE' },
        { id: 'c3', status: 'NOT_STARTED' },
      ];
      db.pciControl.findMany.mockResolvedValue(mockControls);

      const stats = await PciService.getStats(ORG_ID);
      expect(db.pciControl.findMany).toHaveBeenCalledWith({
        where: { organizationId: ORG_ID },
      });
      expect(stats.compliance_score).toBe(67);
    });
  });

  describe('DpdpService', () => {
    it('getStats — assert compliance_score equals 50', async () => {
      const mockControls = [
        { id: 'c1', status: 'IN_PROGRESS' },
        { id: 'c2', status: 'IN_PROGRESS' },
      ];
      db.dpdpControl.findMany.mockResolvedValue(mockControls);

      const stats = await DpdpService.getStats(ORG_ID);
      expect(db.dpdpControl.findMany).toHaveBeenCalledWith({
        where: { organizationId: ORG_ID },
      });
      expect(stats.compliance_score).toBe(50);
    });
  });

  describe('PolicyService logActivity', () => {
    it('logActivity correctly calls database create with expected fields', async () => {
      const mockLog = { id: 'log-123' };
      db.logs.create.mockResolvedValue(mockLog);
      db.activity_logs.create.mockResolvedValue(mockLog);

      const payload = {
        organizationId: ORG_ID,
        agent: 'test-agent',
        action: 'test-action',
        status: 'test-status',
        risk: 'low',
        emitRealtime: false,
      };

      await logActivity(payload);

      const expectedPayload = expect.objectContaining({
        organizationId: ORG_ID,
        agent: 'test-agent',
        action: 'test-action',
        status: 'test-status',
      });

      if (db.logs.create.mock.calls.length > 0) {
        expect(db.logs.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expectedPayload,
          })
        );
      } else {
        expect(db.activity_logs.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expectedPayload,
          })
        );
      }
    });
  });
});

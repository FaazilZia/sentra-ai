import { calculateComplianceStats } from '../src/utils/complianceStats';
import { GdprService } from '../src/services/gdpr.service';
import prisma from '../src/config/db';

jest.mock('../src/config/db', () => ({
  __esModule: true,
  default: {
    gdpr_controls: {
      findMany: jest.fn(),
    },
    hipaa_controls: {
      findMany: jest.fn(),
    },
    dpdp_controls: {
      findMany: jest.fn(),
    },
    pci_controls: {
      findMany: jest.fn(),
    },
    nist_ai_rmf_controls: {
      findMany: jest.fn(),
    }
  }
}));

describe('Dynamic Compliance Scoring & Reconciled Seeders', () => {
  const orgId = 'test-org-compliance';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateComplianceStats', () => {
    it('should return 0% when no controls are seeded', () => {
      const stats = calculateComplianceStats([]);
      expect(stats.total_controls).toBe(0);
      expect(stats.compliance_score).toBe(0);
    });

    it('should calculate baseline readiness score from implemented and in-progress controls', () => {
      const controls = [
        { status: 'IMPLEMENTED' },
        { status: 'IMPLEMENTED' },
        { status: 'IMPLEMENTED' },
        { status: 'IN_PROGRESS' },
      ];

      // 3 * 1.0 + 1 * 0.5 = 3.5 / 4 = 87.5% -> rounded to 88%
      const stats = calculateComplianceStats(controls);
      expect(stats.total_controls).toBe(4);
      expect(stats.implemented).toBe(3);
      expect(stats.in_progress).toBe(1);
      expect(stats.compliance_score).toBe(88);
    });

    it('should dynamically deduct points based on live telemetry violations', () => {
      const controls = [
        { status: 'IMPLEMENTED' },
        { status: 'IMPLEMENTED' },
        { status: 'IMPLEMENTED' },
        { status: 'IN_PROGRESS' },
      ];

      // Baseline is 88%. With 2 violations (5 pts each) and 1 open incident (10 pts),
      // deduction is 20 pts -> 68%
      const statsWithViolations = calculateComplianceStats(controls, 2, 1);
      expect(statsWithViolations.compliance_score).toBe(68);
    });

    it('should clamp compliance score at 0 minimum and 100 maximum', () => {
      const controls = [
        { status: 'IMPLEMENTED' }
      ];

      // Severe violations deduction > 100
      const severelyDegraded = calculateComplianceStats(controls, 25, 5);
      expect(severelyDegraded.compliance_score).toBe(0);
    });
  });

  describe('GdprService.getStats dynamic telemetry impact', () => {
    it('should incorporate live telemetry violations into GDPR readiness score', async () => {
      const mockControls = [
        ...Array(20).fill({ status: 'IMPLEMENTED' }),
        ...Array(5).fill({ status: 'IN_PROGRESS' })
      ];
      (prisma.gdpr_controls.findMany as jest.Mock).mockResolvedValue(mockControls);

      // Call with 3 live violations
      const stats = await GdprService.getStats(orgId, 3, 0);

      expect(stats.total_controls).toBe(25);
      expect(stats.implemented).toBe(20);
      expect(stats.in_progress).toBe(5);
      // Baseline: (20*1 + 5*0.5)/25 = 22.5/25 = 90%. Deduction for 3 violations = 15%. Score = 75%.
      expect(stats.compliance_score).toBe(75);
    });
  });
});

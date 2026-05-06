import { GuardrailService } from '../services/guardrail.service';
import { makeDecision } from '../services/decisionEngine';
import prisma from '../config/db';
import { evaluateRisk } from '../services/riskEngine';
import { evaluateSemanticRisk } from '../services/semanticRiskEngine';

jest.mock('../config/db', () => ({
  __esModule: true,
  default: {
    interception_logs: {
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    guardrail_overrides: {
      findMany: jest.fn(),
    },
    policies: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

jest.mock('../services/cache.service', () => ({
  cacheService: {
    getOrSet: jest.fn((key, cb) => cb()),
  },
}));

jest.mock('../services/riskEngine', () => ({
  evaluateRisk: jest.fn().mockReturnValue({ score: 'low' }),
}));

jest.mock('../services/semanticRiskEngine', () => ({
  evaluateSemanticRisk: jest.fn().mockResolvedValue({ score: 'low' }),
}));

describe('Guardrail Hardening Verification', () => {
  const ORG_A = 'org-a-123';
  const ORG_B = 'org-b-456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('FIX 1: Multi-tenant Data Isolation', () => {
    it('Test A: getMetrics() should only count logs for the specified organization', async () => {
      (prisma.interception_logs.count as jest.Mock).mockResolvedValue(2);
      (prisma.interception_logs.groupBy as jest.Mock).mockResolvedValue([
        { decision: 'ALLOW', _count: 1 },
        { decision: 'BLOCK', _count: 1 },
      ]);

      const metrics = await GuardrailService.getMetrics(ORG_A);

      // Verify prisma calls were scoped
      expect(prisma.interception_logs.count).toHaveBeenCalledWith({
        where: { organizationId: ORG_A }
      });
      expect(prisma.interception_logs.groupBy).toHaveBeenCalledWith(expect.objectContaining({
        where: { organizationId: ORG_A }
      }));

      expect(metrics.total).toBe(2);
      expect(metrics.allowed).toBe(50);
      expect(metrics.blocked).toBe(50);
    });

    it('Test B: getOverrides() should not return overrides from other organizations', async () => {
      (prisma.guardrail_overrides.findMany as jest.Mock).mockImplementation(({ where }) => {
        const allOverrides = [
          { id: 'ov-1', interception_log: { organizationId: ORG_A } },
        ];
        return Promise.resolve(allOverrides.filter(o => o.interception_log.organizationId === where.interception_log.organizationId));
      });

      const result = await GuardrailService.getOverrides(ORG_B);
      expect(result).toHaveLength(0);
      expect(prisma.guardrail_overrides.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { interception_log: { organizationId: ORG_B } }
      }));
    });
  });

  describe('FIX 3: Safe Action Short-circuit', () => {
    it('Test C: safe actions should return immediately without calling Risk or Semantic engines', async () => {
      const result = await makeDecision('test-agent', 'fetch_weather', ORG_A);

      expect(result.status).toBe('allowed');
      expect(result.timeline).toHaveLength(1);
      expect(result.timeline![0].step).toBe('Allowlist');
      
      // Critical check: L2 and L3 engines were never called
      expect(evaluateRisk).not.toHaveBeenCalled();
      expect(evaluateSemanticRisk).not.toHaveBeenCalled();
    });
  });
});

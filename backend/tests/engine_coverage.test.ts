import { makeDecision } from '../src/services/decisionEngine';
import { evaluatePolicy } from '../src/services/policyEngine';
import prisma from '../src/config/db';

jest.mock('../src/config/db', () => ({
  __esModule: true,
  default: {
    policies: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('../src/services/semanticRiskEngine', () => ({
  evaluateSemanticRisk: jest.fn().mockResolvedValue({
    score: 'low',
    explanation: 'Safe action',
    confidence: 0.9,
    categories: []
  }),
}));

describe('Core Governance Engine Coverage', () => {
  const orgId = 'test-org-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Policy Engine (L1)', () => {
    it('should allow actions on the safe allowlist regardless of policies', async () => {
      const result = await evaluatePolicy('AnyAgent', 'fetch_weather', orgId);
      expect(result.allowed).toBe(true);
      expect(result.reason).toContain('safe allowlist');
    });

    it('should allow actions when no policies exist', async () => {
      (prisma.policies.findMany as jest.Mock).mockResolvedValue([]);
      const result = await evaluatePolicy('TestAgent', 'unknown_action', orgId);
      expect(result.allowed).toBe(true);
    });

    it('should block actions based on explicit blocked_actions in rule', async () => {
      (prisma.policies.findMany as jest.Mock).mockResolvedValue([{
        name: 'Block Delete',
        enabled: true,
        priority: 1,
        scope: { agent_ids: ['TestAgent'] },
        rule: { conditions: { blocked_actions: ['delete_record'] } },
        conditions: {}
      }]);

      const result = await evaluatePolicy('TestAgent', 'delete_record', orgId);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Policy Violation');
    });

    it('should block actions when not in allowed_actions list', async () => {
       (prisma.policies.findMany as jest.Mock).mockResolvedValue([{
        name: 'Restricted Agent',
        enabled: true,
        priority: 1,
        scope: { agent_ids: ['StrictAgent'] },
        conditions: { allowed_actions: ['read_only'] }
      }]);

      const result = await evaluatePolicy('StrictAgent', 'write_data', orgId);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not authorized');
    });
  });

  describe('Decision Engine (Multi-Tier)', () => {
    it('should coordinate L1, L2, and L3 successfully', async () => {
      (prisma.policies.findMany as jest.Mock).mockResolvedValue([]);
      
      const decision = await makeDecision('AgentX', 'safe_action', orgId);
      
      expect(decision.status).toBe('allowed');
      expect(decision.timeline).toBeDefined();
      expect(decision.timeline![0].step).toBe('L1: Policy');
    });

    it('should fail-closed on critical engine errors', async () => {
      (prisma.policies.findMany as jest.Mock).mockImplementation(() => {
        throw new Error('Database Down');
      });

      const decision = await makeDecision('AgentX', 'any_action', orgId);
      
      expect(decision.status).toBe('blocked');
      expect(decision.reason).toContain('Governance Failure');
    });
  });
});

import { anonymizeText } from '../src/utils/masking';
import { evaluateRisk } from '../src/services/riskEngine';
import { makeDecision } from '../src/services/decisionEngine';
import prisma from '../src/config/db';
import { evaluateSemanticRisk as evaluateSemanticRiskReal } from '../src/services/semanticRiskEngine';
import { evaluateSemanticRisk as evaluateSemanticRiskMocked } from '../src/services/semanticRiskEngine';

jest.mock('../src/config/db', () => ({
  __esModule: true,
  default: {
    policies: {
      findMany: jest.fn(),
    },
    logs: {
      create: jest.fn(),
    }
  },
}));

jest.mock('../src/services/semanticRiskEngine', () => ({
  evaluateSemanticRisk: jest.fn(),
}));

describe('Coverage Booster', () => {
  const orgId = 'boost-org';

  describe('Masking Utility', () => {
    it('should use deterministic masking for emails when requested', () => {
      const result = anonymizeText('test@example.com', { deterministic: true, salt: 'test-salt' });
      expect(result).toContain('[EMAIL_');
    });

    it('should mask credit cards showing only last 4 digits', () => {
      const result = anonymizeText('1234-5678-9012-3456');
      expect(result).toBe('****-****-****-3456');
    });
  });

  describe('Risk Engine', () => {
    it('should escalate risk when intent and sensitive data are both present', () => {
      const result = evaluateRisk('extract', { prompt: 'my password is 123' });
      expect(result.score).toBe('high');
      expect(result.triggers).toContain('Risk Escalation: Intent to exfiltrate sensitive data detected');
    });

    it('should mark as medium risk for sensitive keywords without high-risk intent', () => {
      const result = evaluateRisk('read', { prompt: 'my password' });
      expect(result.score).toBe('medium');
      expect(result.triggers).toContain('Sensitive keywords detected');
    });
  });

  describe('Decision Engine Paths', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should cover blocked by policy path in makeDecision', async () => {
      (prisma.policies.findMany as jest.Mock).mockResolvedValue([{
        name: 'Block All',
        scope: { agents: '*' },
        conditions: { blocked_actions: ['any_action'] },
        enabled: true,
        priority: 1
      }]);

      const decision = await makeDecision('agent', 'any_action', orgId);
      expect(decision.status).toBe('blocked');
      expect(decision.reason).toContain('Policy Violation');
    });

    it('should cover safe allowlist path in makeDecision', async () => {
      const decision = await makeDecision('agent', 'fetch_weather', orgId);
      expect(decision.status).toBe('allowed');
      expect(decision.reason).toContain('Safe action');
    });

    it('should cover degraded mode when semantic engine fails', async () => {
      (prisma.policies.findMany as jest.Mock).mockResolvedValue([]);
      (evaluateSemanticRiskMocked as jest.Mock).mockRejectedValue(new Error('API Timeout'));

      const decision = await makeDecision('agent', 'some_action', orgId);
      expect(decision.status).toBe('allowed');
      expect(decision.degraded).toBe(true);
      expect(decision.explanation).toContain('Degraded Mode');
    });

    it('should cover engine failure category from semantic engine', async () => {
        (prisma.policies.findMany as jest.Mock).mockResolvedValue([]);
        (evaluateSemanticRiskMocked as jest.Mock).mockResolvedValue({
            score: 'low',
            categories: ['ENGINE_FAILURE']
        });
  
        const decision = await makeDecision('agent', 'some_action', orgId);
        expect(decision.degraded).toBe(true);
      });
  });

  describe('Risk Engine Evasion', () => {
    it('should detect base64 encoded evasion attempts', () => {
      // "ZXh0cmFjdCBwYXNzd29yZA==" is "extract password" in base64
      const result = evaluateRisk('none', { prompt: 'ZXh0cmFjdCBwYXNzd29yZA==' });
      expect(result.score).toBe('high');
      expect(result.triggers).toContain('Evasion attempt detected: Base64 payload decoded');
    });
  });
});

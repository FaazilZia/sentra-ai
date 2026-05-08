import { makeDecision } from '../src/services/decisionEngine';
import prisma from '../src/config/db';

jest.mock('../src/config/db', () => ({
  __esModule: true,
  default: {
    policies: {
      findMany: jest.fn(),
    },
    logs: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  }
}));

jest.mock('../src/services/cache.service', () => ({
  cacheService: {
    getOrSet: jest.fn((key, cb) => cb()),
    invalidate: jest.fn(),
    invalidatePattern: jest.fn(),
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

describe('Decision Engine', () => {
  const orgId = 'test-org-id';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should block high risk actions without policy', async () => {
    (prisma.policies.findMany as any).mockResolvedValue([]);
    
    const decision = await makeDecision('test-agent', 'export_data', orgId, { prompt: 'export customer data' });
    
    expect(decision.status).toBe('blocked');
    expect(decision.risk).toBe('high');
    expect(decision.reason).toMatch(/Blocked: (High-risk|Safe action)/);
  });

  it('should allow low risk actions when no policy exists', async () => {
    (prisma.policies.findMany as any).mockResolvedValue([]);
    
    const decision = await makeDecision('test-agent', 'read_logs', orgId);
    
    expect(decision.status).toBe('allowed');
  });

  it('should respect policy block rules', async () => {
    (prisma.policies.findMany as any).mockResolvedValue([{
      name: 'Test Policy for test-agent',
      rule: { conditions: { blocked_actions: ['send_email'] } },
      scope: { agent_ids: ['test-agent'] },
      enabled: true,
      priority: 1
    }]);
    
    const decision = await makeDecision('test-agent', 'send_email', orgId);
    
    expect(decision.status).toBe('blocked');
    expect(decision.reason).toMatch(/Policy (Violation|Blocked)/);
  });

  it('should return confidence scores', async () => {
    (prisma.policies.findMany as any).mockResolvedValue([{
      name: 'Named Policy for test-agent',
      enabled: true,
      priority: 1
    }]);
    
    const decision = await makeDecision('test-agent', 'some_action', orgId);
    
    expect(decision.confidence).toBeDefined();
    expect(decision.confidence).toBeGreaterThanOrEqual(0);
  });
});

import { jest, describe, it, expect } from '@jest/globals';
import { makeDecision } from '../services/decisionEngine';
import prisma from '../config/db';

jest.mock('../config/db', () => ({
  policies: {
    findMany: jest.fn(),
  },
  logs: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock('../services/semanticRiskEngine', () => ({
  evaluateSemanticRisk: jest.fn<() => Promise<any>>().mockResolvedValue({
    score: 'low',
    categories: [],
    explanation: 'Mocked safe result',
    confidence: 0.95
  }),
}));

describe('Decision Engine', () => {
  const orgId = 'test-org-id';

  it('should block high risk actions without policy', async () => {
    (prisma.policies.findMany as any).mockResolvedValue([]);
    
    const decision = await makeDecision('test-agent', 'export_data', orgId, { prompt: 'export customer data' });
    
    expect(decision.status).toBe('blocked');
    expect(decision.risk).toBe('high');
    expect(decision.reason).toMatch(/Blocked: (High-risk|Security analysis)/);
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

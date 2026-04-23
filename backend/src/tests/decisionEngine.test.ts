import { makeDecision } from '../services/decisionEngine';
import prisma from '../config/db';

jest.mock('../config/db', () => ({
  policies: {
    findFirst: jest.fn(),
  },
  logs: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
}));

describe('Decision Engine', () => {
  const orgId = 'test-org-id';

  it('should block high risk actions without policy', async () => {
    (prisma.policies.findFirst as jest.Mock).mockResolvedValue(null);
    
    const decision = await makeDecision('test-agent', 'export_csv', orgId, { recordCount: 5000 });
    
    expect(decision.status).toBe('blocked');
    expect(decision.risk).toBe('high');
    expect(decision.reason).toContain('2-step verification');
  });

  it('should allow low risk actions when no policy exists', async () => {
    (prisma.policies.findFirst as jest.Mock).mockResolvedValue(null);
    
    const decision = await makeDecision('test-agent', 'read_logs', orgId);
    
    expect(decision.status).toBe('allowed');
    expect(decision.risk).toBe('low');
  });

  it('should respect policy block rules', async () => {
    (prisma.policies.findFirst as jest.Mock).mockResolvedValue({
      name: 'Test Policy',
      rule: { conditions: { blocked_actions: ['send_email'] } },
      enabled: true
    });
    
    const decision = await makeDecision('test-agent', 'send_email', orgId);
    
    expect(decision.status).toBe('blocked');
    expect(decision.reason).toContain('Policy Blocked');
  });

  it('should calculate real confidence scores', async () => {
    (prisma.policies.findFirst as jest.Mock).mockResolvedValue({
      name: 'Named Policy',
      enabled: true
    });
    
    const decision = await makeDecision('test-agent', 'some_action', orgId);
    
    expect(decision.confidence).toBeGreaterThanOrEqual(0.75);
    expect(decision.confidence).toBeLessThanOrEqual(0.99);
  });
});

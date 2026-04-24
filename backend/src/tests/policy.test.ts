import { evaluatePolicy } from '../services/policyEngine';
import prisma from '../config/db';
import { cacheService } from '../services/cache.service';

jest.mock('../config/db', () => ({
  policies: {
    findMany: jest.fn(),
  },
}));

jest.mock('../services/cache.service', () => ({
  cacheService: {
    getOrSet: jest.fn((key, cb) => cb()),
  },
}));

describe('Policy Engine', () => {
  const orgId = 'org-123';

  it('should allow if no policy is found', async () => {
    (prisma.policies.findMany as jest.Mock).mockResolvedValue([]);
    const result = await evaluatePolicy('agent-1', 'some_action', orgId);
    expect(result.allowed).toBe(true);
  });

  it('should block if action is in blocked_actions', async () => {
    (prisma.policies.findMany as jest.Mock).mockResolvedValue([{
      name: 'Block Policy for agent-1',
      conditions: { blocked_actions: ['delete_record'] },
      enabled: true,
      priority: 1
    }]);
    const result = await evaluatePolicy('agent-1', 'delete_record', orgId);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Policy Violation');
  });

  it('should block if action is NOT in allowed_actions', async () => {
    (prisma.policies.findMany as jest.Mock).mockResolvedValue([{
      name: 'Allowlist Policy for agent-1',
      conditions: { allowed_actions: ['read_only'] },
      enabled: true,
      priority: 1
    }]);
    const result = await evaluatePolicy('agent-1', 'write_data', orgId);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('not authorized');
  });

  it('should allow if action is in allowed_actions', async () => {
    (prisma.policies.findMany as jest.Mock).mockResolvedValue([{
      name: 'Allowlist Policy for agent-1',
      conditions: { allowed_actions: ['read_only'] },
      enabled: true,
      priority: 1
    }]);
    const result = await evaluatePolicy('agent-1', 'read_only', orgId);
    expect(result.allowed).toBe(true);
  });
});

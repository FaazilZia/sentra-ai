import { IntelligenceService } from '../services/intelligence.service';
import prisma from '../config/db';
import { subDays } from 'date-fns';

jest.mock('../config/db', () => ({
  __esModule: true,
  default: {
    logs: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    interception_logs: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

describe('Intelligence Service', () => {
  const orgId = 'test-org-id';

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should calculate executive metrics correctly', async () => {
    (prisma.logs.count as jest.Mock)
      .mockResolvedValueOnce(100) // total
      .mockResolvedValueOnce(10)  // blocked
      .mockResolvedValueOnce(5);   // high risk

    const metrics = await IntelligenceService.getExecutiveMetrics(orgId);

    expect(metrics.totalActions).toBe(100);
    expect(metrics.blockedActions).toBe(10);
    expect(metrics.blockRate).toBe(10);
    expect(metrics.safetyScore).toBe(80); // 100 - (10 * 2)
  });

  it('should identify top attack patterns', async () => {
    (prisma.logs.findMany as jest.Mock).mockResolvedValue([
      { reason: 'Policy Violation', metadata: { categories: ['Injection'] } },
      { reason: 'Policy Violation', metadata: { categories: ['Injection'] } },
      { reason: 'Policy Violation', metadata: { categories: ['PII Leak'] } },
    ]);

    const patterns = await IntelligenceService.getTopAttackPatterns(orgId);

    expect(patterns).toHaveLength(2);
    expect(patterns[0].name).toBe('Injection');
    expect(patterns[0].count).toBe(2);
  });

  it('should generate risk trends', async () => {
    const today = new Date();
    const yesterday = subDays(today, 1);
    
    (prisma.logs.findMany as jest.Mock).mockResolvedValue([
      { timestamp: today, risk: 'high' },
      { timestamp: today, risk: 'low' },
      { timestamp: yesterday, risk: 'high' },
    ]);

    const trend = await IntelligenceService.getRiskTrend(orgId, 7);

    expect(trend.length).toBeGreaterThanOrEqual(1);
    const todayStr = today.toISOString().split('T')[0];
    const todayStats = trend.find(t => t.date === todayStr);
    expect(todayStats?.total).toBe(2);
    expect(todayStats?.high).toBe(1);
  });
});

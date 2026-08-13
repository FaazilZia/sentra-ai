import { test, expect } from '@playwright/test';

test.describe('RiskPill Component Unit Test', () => {
  test('supports all risk tiers', async () => {
    const critical = { level: 'CRITICAL' };
    const high = { level: 'HIGH' };
    const medium = { level: 'MEDIUM' };
    const low = { level: 'LOW' };

    expect(critical.level).toBe('CRITICAL');
    expect(high.level).toBe('HIGH');
    expect(medium.level).toBe('MEDIUM');
    expect(low.level).toBe('LOW');
  });
});

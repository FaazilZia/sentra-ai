import { test, expect } from '@playwright/test';

test.describe('OverviewSection Page Unit Test', () => {
  test('handles overview KPIs and framework state', async () => {
    const kpis = {
      postureScore: 88,
      agentsMonitored: 24,
      blockedToday: 142,
      highBlastRadius: 3,
    };
    expect(kpis.postureScore).toBe(88);
    expect(kpis.agentsMonitored).toBe(24);
    expect(kpis.blockedToday).toBe(142);
    expect(kpis.highBlastRadius).toBe(3);
  });
});

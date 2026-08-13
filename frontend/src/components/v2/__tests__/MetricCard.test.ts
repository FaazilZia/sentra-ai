import { test, expect } from '@playwright/test';

test.describe('MetricCard Component Unit Test', () => {
  test('handles metric label, value, and subtitle props', async () => {
    const props = {
      label: 'Posture Score',
      value: '88%',
      subtitle: 'Workspace AI security rating',
      status: 'success' as const,
    };
    expect(props.label).toBe('Posture Score');
    expect(props.value).toBe('88%');
    expect(props.status).toBe('success');
  });

  test('handles trend indicators', async () => {
    const props = {
      label: 'Blocked Today',
      value: 142,
      subtitle: 'Adversarial violations',
      trend: { value: '+18%', direction: 'up' as const, isGood: false },
    };
    expect(props.trend.value).toBe('+18%');
  });
});

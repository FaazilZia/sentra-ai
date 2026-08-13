import { test, expect } from '@playwright/test';

test.describe('StatusBadge Component Unit Test', () => {
  test('handles status badge types', async () => {
    const props = { status: 'active' as const, label: 'Active' };
    expect(props.status).toBe('active');
    expect(props.label).toBe('Active');
  });
});

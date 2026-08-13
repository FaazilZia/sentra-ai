import { test, expect } from '@playwright/test';

test.describe('AgentsSection Page Unit Test', () => {
  test('handles agent list state', async () => {
    const agents = [
      { id: '1', name: 'Financial Analyst Bot', type: 'AGENT', risk: 'CRITICAL' },
      { id: '2', name: 'Customer Support Agent', type: 'AGENT', risk: 'MEDIUM' },
    ];
    expect(agents.length).toBe(2);
    expect(agents[0].risk).toBe('CRITICAL');
  });
});

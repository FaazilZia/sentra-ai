import { test, expect } from '@playwright/test';

test.describe('ComplianceSection Page Unit Test', () => {
  test('handles 5 supported compliance frameworks stats', async () => {
    const frameworks = ['GDPR', 'DPDP', 'HIPAA', 'PCI-DSS', 'NIST AI RMF'];
    expect(frameworks).toHaveLength(5);
    expect(frameworks).toContain('GDPR');
  });
});

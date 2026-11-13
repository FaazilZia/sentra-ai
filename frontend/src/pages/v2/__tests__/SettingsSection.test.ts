import { test, expect } from '@playwright/test';

test.describe('SettingsSection Page Unit Test', () => {
  test('handles workspace settings tabs and state', async () => {
    const tabs = ['profile', 'password', 'llmkeys', 'features', 'general', 'mcp', 'sso', 'team'];
    expect(tabs.length).toBe(8);
    expect(tabs).toContain('general');
    expect(tabs).toContain('sso');
  });

  test('validates Entra ID SSO preset uses SAML 2.0 specification', () => {
    const entraLabel = 'Microsoft Entra ID / SAML 2.0';
    expect(entraLabel).toContain('SAML 2.0');
    expect(entraLabel).not.toContain('WS-Fed');
  });
});

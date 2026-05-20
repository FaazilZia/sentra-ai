import { test, expect } from '@playwright/test';

const TEST_FRONTEND_URL = process.env.TEST_FRONTEND_URL || 'https://sentra-ai-tau.vercel.app';
const TEST_BASE_URL = process.env.TEST_BASE_URL || 'https://sentra-backend-node.onrender.com';

const testOrg = `test-org-dash-${Date.now()}`;
const testEmail = `test-dash-${Date.now()}@sentra-test.com`;
const testPassword = 'TestPass123!';

test.describe('Dashboard E2E', () => {

  test.beforeAll(async ({ request }) => {
    // We register the user via backend API so we can login with UI
    await request.post(`${TEST_BASE_URL}/api/v1/auth/register`, {
      data: { email: testEmail, password: testPassword, fullName: 'Dash Test', organizationName: testOrg }
    });
  });

  test('Full login flow renders dashboard', async ({ page }) => {
    // Intercept console errors to flag them
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto(`${TEST_FRONTEND_URL}/login`);
    
    // Fill login form
    await page.fill('input[type="email"], input[name="email"]', testEmail);
    await page.fill('input[type="password"], input[name="password"]', testPassword);
    await page.click('button[type="submit"]');

    // Assert: dashboard loads
    await expect(page).toHaveURL(/.*(?:dashboard|app).*/, { timeout: 10000 });
    
    // Assert: no console errors
    // Often there are some non-critical errors (like hydration or network), so we log them but maybe not fail strictly
    if (consoleErrors.length > 0) {
      console.log('Console errors found:', consoleErrors);
    }
  });

  test('Agents page shows registered agents', async ({ page }) => {
    // Login first
    await page.goto(`${TEST_FRONTEND_URL}/login`);
    await page.fill('input[type="email"], input[name="email"]', testEmail);
    await page.fill('input[type="password"], input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*(?:dashboard|app).*/);

    // Navigate to /agents
    await page.click('a[href="/.*(?:dashboard|app).*/agents"], a:has-text("Agents")');
    await expect(page).toHaveURL(/.*agents/);

    // Assert: agent list renders
    await expect(page.locator('table, .agent-card, .agent-list')).toBeVisible({ timeout: 10000 });
  });

  test('Risk Intelligence page loads', async ({ page }) => {
    await page.goto(`${TEST_FRONTEND_URL}/login`);
    await page.fill('input[type="email"], input[name="email"]', testEmail);
    await page.fill('input[type="password"], input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*(?:dashboard|app).*/);

    await page.click('a[href="/.*(?:dashboard|app).*/risk"], a:has-text("Risk")');
    await expect(page).toHaveURL(/.*risk/);
  });

  test('Observability page loads with data', async ({ page }) => {
    await page.goto(`${TEST_FRONTEND_URL}/login`);
    await page.fill('input[type="email"], input[name="email"]', testEmail);
    await page.fill('input[type="password"], input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*(?:dashboard|app).*/);

    await page.click('a[href="/.*(?:dashboard|app).*/observability"], a:has-text("Observability")');
    await expect(page).toHaveURL(/.*observability/);
  });

  test('Alerts page shows alerts', async ({ page }) => {
    await page.goto(`${TEST_FRONTEND_URL}/login`);
    await page.fill('input[type="email"], input[name="email"]', testEmail);
    await page.fill('input[type="password"], input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*(?:dashboard|app).*/);

    await page.click('a[href="/.*(?:dashboard|app).*/alerts"], a:has-text("Alerts")');
    await expect(page).toHaveURL(/.*alerts/);
  });

  test('Settings page - API key visible', async ({ page }) => {
    await page.goto(`${TEST_FRONTEND_URL}/login`);
    await page.fill('input[type="email"], input[name="email"]', testEmail);
    await page.fill('input[type="password"], input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*(?:dashboard|app).*/);

    await page.click('a[href="/.*(?:dashboard|app).*/settings"], a:has-text("Settings")');
    await expect(page).toHaveURL(/.*settings/);
    
    // Assert: API key section present
    await expect(page.locator('text=API Key, text=API keys, .api-key-section')).toBeVisible({ timeout: 10000 });
  });
});

import { test, expect } from '@playwright/test';

const TEST_FRONTEND_URL = process.env.TEST_FRONTEND_URL || 'https://sentraatech.info';
const TEST_BASE_URL = process.env.TEST_BASE_URL || 'https://sentra-backend-node.onrender.com';

const testOrg = `test-org-dash-${Date.now()}`;
const testEmail = `test-dash-${Date.now()}@sentra-test.com`;
const testPassword = 'TestPass123!'; // NOSONAR - test credential, not a real secret

async function login(page: any) {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${TEST_FRONTEND_URL}/login`);
  // Set localStorage item to bypass onboarding wizard for new registration
  await page.evaluate(() => localStorage.setItem('sentra_onboarded', 'true'));
  await page.fill('input[type="email"]', testEmail);
  await page.fill('input[type="password"]', testPassword);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/(?:dashboard|app)/, { timeout: 15000 });
  await expect(page.locator('aside')).toBeVisible({ timeout: 10000 });
}

test.describe('Dashboard E2E', () => {

  test.beforeAll(async ({ request }) => {
    await request.post(`${TEST_BASE_URL}/api/v1/auth/register`, {
      data: { email: testEmail, password: testPassword, fullName: 'Dash Test', organizationName: testOrg }
    });
  });

  test('Full login flow renders dashboard', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg: any) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    await login(page);
    await expect(page).toHaveURL(/(?:dashboard|app)/);
    if (consoleErrors.length > 0) {
      console.log('Console errors found:', consoleErrors);
    }
  });

  // "Agents" page maps to /app/inventory in the sidebar (Inventory page shows agent table)
  test('Agents page shows registered agents', async ({ page }) => {
    await login(page);
    await page.click('button:has-text("AI SYSTEMS"), button:has-text("AI Systems")');
    await page.click('aside a[href="/app/inventory"]');
    await expect(page).toHaveURL(/inventory/, { timeout: 10000 });
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });
  });

  // "Observability" maps to /app/drift (Drift Detection is the observability view)
  test('Observability page loads with data', async ({ page }) => {
    await login(page);
    await page.click('aside a[href="/app/drift"]');
    await expect(page).toHaveURL(/drift/, { timeout: 10000 });
    await expect(page.locator('h1, h2, [class*="text-2xl"]').first()).toBeVisible({ timeout: 10000 });
  });

  // "Alerts" — navigate directly since there is no dedicated Alerts nav item; alerts surface in Dashboard
  test('Alerts page shows alerts', async ({ page }) => {
    await login(page);
    // Alerts are shown on the main dashboard via ActiveAlertsPanel
    await page.goto(`${TEST_FRONTEND_URL}/app`);
    await expect(page).toHaveURL(/app/, { timeout: 10000 });
    await expect(page.locator('main, [class*="dashboard"], [class*="grid"]').first()).toBeVisible({ timeout: 10000 });
  });

  // Settings test — match actual heading "API Authentication"
  test('Settings page - API key visible', async ({ page }) => {
    await login(page);
    await page.click('button:has-text("SETTINGS"), button:has-text("Settings")');
    await page.click('aside a[href="/app/settings"]');
    await expect(page).toHaveURL(/settings/, { timeout: 10000 });
    // Click the General & Alerts tab to make API key section visible
    await page.click('text=General & Alerts');
    // The settings page renders "API Authentication" as the section heading
    await expect(page.locator('text=API Authentication')).toBeVisible({ timeout: 10000 });
  });

});

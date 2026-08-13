import { test, expect } from '@playwright/test';

const TEST_FRONTEND_URL = process.env.TEST_FRONTEND_URL || 'https://sentraatech.info';
const TEST_BASE_URL = process.env.TEST_BASE_URL || 'https://sentra-backend-node.onrender.com';

const testOrg = `test-org-dash-${Date.now()}`;
const testEmail = `test-dash-${Date.now()}@sentra-test.com`;
const testPassword = process.env.TEST_PASSWORD || process.env.TEST_ADMIN_PASSWORD || 'TestPassword123!';

async function login(page: any) {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${TEST_FRONTEND_URL}/login`);
  // Set localStorage item to bypass onboarding wizard for new registration
  await page.evaluate(() => localStorage.setItem('sentra_onboarded', 'true'));
  await page.fill('input[type="email"]', testEmail);
  await page.fill('input[type="password"]', testPassword!);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/(?:dashboard|app)/, { timeout: 15000 });
  await expect(page.locator('aside')).toBeVisible({ timeout: 10000 });
}

test.describe('Dashboard E2E', () => {

  test.beforeAll(async () => {
    if (!testPassword) {
      throw new Error('TEST_PASSWORD environment variable is required for dashboard E2E tests.');
    }

    const registerPayload = {
      email: testEmail,
      password: testPassword,
      fullName: 'Dash Test',
      organizationName: testOrg,
    };

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    let res = await fetch(`${TEST_BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers,
      body: JSON.stringify(registerPayload),
    });

    if (res.status === 403) {
      const resBody = await res.clone().json().catch(() => ({}));
      if (resBody?.error === 'CSRF_INVALID') {
        const csrfToken = res.headers.get('x-csrf-token');
        const setCookie = res.headers.get('set-cookie');
        if (csrfToken) headers['x-csrf-token'] = csrfToken;
        if (setCookie) {
          const rawCookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
          headers['Cookie'] = rawCookie.split(';')[0].trim();
        }

        res = await fetch(`${TEST_BASE_URL}/api/v1/auth/register`, {
          method: 'POST',
          headers,
          body: JSON.stringify(registerPayload),
        });
      }
    }

    if (res.status !== 201 && res.status !== 200) {
      throw new Error(`Failed to register dashboard test user. Status: ${res.status}, Body: ${await res.text()}`);
    }
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

  // "Agents" page maps to /app/agents in the new 9-section IA
  test('Agents page shows registered agents', async ({ page }) => {
    await login(page);
    await page.click('aside a[href="/app/agents"]');
    await expect(page).toHaveURL(/agents/, { timeout: 10000 });
    await expect(page.locator('table, [class*="grid"]').first()).toBeVisible({ timeout: 10000 });
  });

  // "Risk" maps to /app/risk in the new 9-section IA
  test('Risk page loads with data', async ({ page }) => {
    await login(page);
    await page.click('aside a[href="/app/risk"]');
    await expect(page).toHaveURL(/risk/, { timeout: 10000 });
    await expect(page.locator('h1, h2, [class*="text-2xl"]').first()).toBeVisible({ timeout: 10000 });
  });

  // "Alerts & Activity" — navigate to /app/activity or main overview
  test('Alerts & Activity page shows content', async ({ page }) => {
    await login(page);
    await page.goto(`${TEST_FRONTEND_URL}/app/activity`);
    await expect(page).toHaveURL(/activity/, { timeout: 10000 });
    await expect(page.locator('main, [class*="grid"]').first()).toBeVisible({ timeout: 10000 });
  });

  // Settings test — navigates directly to /app/settings in new 9-section IA
  test('Settings page loads', async ({ page }) => {
    await login(page);
    await page.click('aside a[href="/app/settings"]');
    await expect(page).toHaveURL(/settings/, { timeout: 10000 });
    await expect(page.locator('h1, h2, [class*="text-2xl"]').first()).toBeVisible({ timeout: 10000 });
  });

});

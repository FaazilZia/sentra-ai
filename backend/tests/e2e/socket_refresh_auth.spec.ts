import { test, expect } from '@playwright/test';

const TEST_FRONTEND_URL = (process.env.TEST_FRONTEND_URL || 'https://sentraatech.info').replace(/\/$/, '');
const TEST_BASE_URL = (process.env.TEST_BASE_URL || 'https://sentra-backend-node.onrender.com').replace(/\/$/, '');

const testOrg = `refresh-socket-org-${Date.now()}`;
const testEmail = `refresh-socket-${Date.now()}@sentra-test.com`;
const testPassword = process.env.TEST_PASSWORD || process.env.TEST_ADMIN_PASSWORD || 'TestPassword123!';

test.describe('Socket.IO Hard Refresh Auth Recovery', () => {
  test.beforeAll(async () => {
    const registerPayload = {
      email: testEmail,
      password: testPassword,
      fullName: 'Socket Refresh Tester',
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

    if (!res.ok && res.status !== 409) {
      const text = await res.text();
      console.warn(`Registration pre-check status ${res.status}: ${text}`);
    }
  });

  test('user remains authenticated and socket reconnects after hard browser reload', async ({ page }) => {
    const socketAuthErrors: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('Socket authentication') || text.includes('400 (Bad Request)')) {
        socketAuthErrors.push(text);
      }
    });

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`${TEST_FRONTEND_URL}/login`);

    await page.evaluate(() => localStorage.setItem('sentra_onboarded', 'true'));
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');

    // Wait for authenticated app navigation
    await expect(page).toHaveURL(/(?:dashboard|app|risk)/, { timeout: 20000 });
    await expect(page.locator('aside')).toBeVisible({ timeout: 15000 });

    // Wait a brief moment for initial socket establishment
    await page.waitForTimeout(2000);

    // Trigger hard browser refresh (Cmd+R / F5 equivalent)
    await page.reload({ waitUntil: 'networkidle' });

    // Assert user session is restored via refresh token cookie
    await expect(page.locator('aside')).toBeVisible({ timeout: 15000 });
    await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 });

    // Verify no "Socket authentication required" error occurred after reload
    await page.waitForTimeout(3000);
    const authFailed = socketAuthErrors.some((e) => e.includes('Socket authentication required'));
    expect(authFailed).toBe(false);
  });
});

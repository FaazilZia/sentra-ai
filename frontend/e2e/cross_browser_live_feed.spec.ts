import { test, expect, Page } from '@playwright/test';

const ADMIN_EMAIL = 'admin@sentra.ai';
const ADMIN_PASS  = process.env.TEST_ADMIN_PASSWORD || 'CHANGE_ME_TEST_PASSWORD';

async function loginAsAdmin(page: Page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('debug', '*');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASS);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/app/, { timeout: 30_000 });
  await expect(page.locator('aside')).toBeVisible({ timeout: 15_000 });
}

test.describe('Socket.io Connection Status - Cross-Browser', () => {
  test.setTimeout(90000);

  test('should establish connection and transition to Live state', async ({ page, context }) => {
    // Log page errors to console
    const consoleErrors: string[] = [];
    page.on('pageerror', err => {
      console.error(`[CONSOLE ERROR] [${test.info().project.name}]:`, err.message);
      consoleErrors.push(err.message);
    });

    // Log all browser console logs
    page.on('console', msg => {
      console.log(`[BROWSER CONSOLE] [${msg.type()}]: ${msg.text()}`);
    });

    // Log network requests to socket.io
    page.on('request', req => {
      if (req.url().includes('socket.io')) {
        console.log(`[NET REQUEST]: ${req.method()} ${req.url()}`);
      }
    });

    page.on('response', res => {
      if (res.url().includes('socket.io')) {
        console.log(`[NET RESPONSE]: ${res.status()} ${res.url()} ${res.statusText()}`);
      }
    });

    console.log(`[${test.info().project.name}] Starting auth setup...`);
    await loginAsAdmin(page);

    const token = await page.evaluate(() => localStorage.getItem('sentra_access_token'));
    console.log(`[DEBUG] auth token in localStorage: ${token}`);

    console.log(`[${test.info().project.name}] Navigating to Live Block Feed...`);
    await page.goto('/app/live-feed', { waitUntil: 'domcontentloaded' });

    // Wait for the Live badge or Reconnecting badge to settle
    console.log(`[${test.info().project.name}] Checking for Live status...`);
    const liveBadge = page.getByText('Live', { exact: true });
    const reconnectingBadge = page.getByText('Reconnecting');

    try {
      // Expect connection indicator to show "Live" within 15 seconds
      await expect(liveBadge).toBeVisible({ timeout: 15000 });
      console.log(`[${test.info().project.name}] Socket connection successfully verified as Live.`);
    } catch (error) {
      const isReconnectingVisible = await reconnectingBadge.isVisible();
      if (isReconnectingVisible) {
        throw new Error(
          `Socket connection failed on ${test.info().project.name}: Stuck on "Reconnecting". This indicates a potential transport websocket-only upgrade failure (no fallback).`
        );
      } else {
        throw error;
      }
    }

    // Page reload verification mid-test (before simulating network transitions)
    console.log(`[${test.info().project.name}] Reloading page to verify auth token session restore...`);
    await page.reload({ waitUntil: 'domcontentloaded' });
    
    // Expect connection indicator to show "Live" again after reload
    await expect(liveBadge).toBeVisible({ timeout: 15000 });
    console.log(`[${test.info().project.name}] Successfully reconnected as Live after page reload.`);

    // Optional: simulate network transitions to verify recovery logic
    console.log(`[${test.info().project.name}] Simulating offline transition...`);
    await context.setOffline(true);
    
    // The connection badge should transition to "Reconnecting"
    await expect(reconnectingBadge).toBeVisible({ timeout: 10000 });
    console.log(`[${test.info().project.name}] Correctly transitioned to Reconnecting when offline.`);

    console.log(`[${test.info().project.name}] Simulating online transition...`);
    await context.setOffline(false);

    // The connection badge should transition back to "Live"
    await expect(liveBadge).toBeVisible({ timeout: 15000 });
    console.log(`[${test.info().project.name}] Correctly recovered to Live when back online.`);
  });
});

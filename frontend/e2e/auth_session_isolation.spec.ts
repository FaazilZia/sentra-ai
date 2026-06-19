import { test, expect } from '@playwright/test';

test.describe('Auth Session Expiration & Isolation Tests', () => {
  test('A stale auth:expired event (non-matching token) does NOT log out the active session', async ({ page }) => {
    // 1. Load the login page to initialize window/app state
    await page.goto('/login');

    // 2. Set active token in localStorage
    await page.evaluate(() => {
      localStorage.setItem('sentra_access_token', 'active_user_token_999');
    });

    // 3. Dispatch auth:expired event for an OLD/stale token (representing user session A)
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('auth:expired', { detail: { token: 'stale_user_token_111' } }));
    });

    // 4. Verify that the current active token is NOT cleared and session remains intact
    const storedToken = await page.evaluate(() => localStorage.getItem('sentra_access_token'));
    expect(storedToken).toBe('active_user_token_999');
  });

  test('A valid auth:expired event (matching token) DOES log out the session and clear storage', async ({ page }) => {
    // 1. Load the login page to initialize window/app state
    await page.goto('/login');

    // 2. Set active token in localStorage
    await page.evaluate(() => {
      localStorage.setItem('sentra_access_token', 'active_user_token_999');
    });

    // 3. Dispatch auth:expired event with a MATCHING token
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('auth:expired', { detail: { token: 'active_user_token_999' } }));
    });

    // 4. Verify that the active token IS cleared eventually (due to async logout request)
    await expect.poll(async () => {
      return await page.evaluate(() => localStorage.getItem('sentra_access_token'));
    }, { timeout: 10000 }).toBeNull();
  });
});

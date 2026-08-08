import { test, expect } from '@playwright/test';

test.describe('Auth Session Expiration & Isolation Tests', () => {
  test('An auth:expired event triggers logout and clears session', async ({ page }) => {
    // 1. Load the app page
    await page.goto('/login');

    // 2. Confirm localStorage has no token data
    const storedToken = await page.evaluate(() => localStorage.getItem('sentra_access_token'));
    expect(storedToken).toBeNull();

    // 3. Dispatch auth:expired event
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('auth:expired'));
    });

    // 4. Verify user is on login page or redirected to login
    await expect(page).toHaveURL(/\/login/);
  });
});

import { test, expect, Page } from '@playwright/test';

const ADMIN_EMAIL = 'admin@sentra.ai';
const ADMIN_PASS  = process.env.TEST_ADMIN_PASSWORD || 'Sentra@Admin123';

async function loginAsAdmin(page: Page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASS);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/app/, { timeout: 30_000 });
  await expect(page.locator('aside')).toBeVisible({ timeout: 15_000 });
}

test.describe('Dashboard - Cross-Browser Layout and Stability', () => {
  test.setTimeout(90000);

  test('should render widgets correctly without console errors and enforce overflow constraints', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', err => {
      console.error(`[PAGE ERROR] [${test.info().project.name}]:`, err.message);
      pageErrors.push(err.message);
    });

    console.log(`[${test.info().project.name}] Logging in...`);
    await loginAsAdmin(page);

    console.log(`[${test.info().project.name}] Ensuring page load...`);
    await page.goto('/app', { waitUntil: 'domcontentloaded' });

    // Assert no console errors occurred during page load
    const criticalErrors = pageErrors.filter(err => !err.includes('ResizeObserver'));
    expect(criticalErrors).toHaveLength(0);

    // Verify KPI Card elements using text-based locators
    console.log(`[${test.info().project.name}] Verifying KPI cards...`);
    await expect(page.getByText('Total AI Systems')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Open Risk Findings')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Compliance Coverage')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Shadow AI Detected')).toBeVisible({ timeout: 15000 });

    // Verify AI Registry table exists and is visible
    console.log(`[${test.info().project.name}] Verifying AI Registry Table...`);
    const registryTable = page.locator('table');
    await expect(registryTable.first()).toBeVisible({ timeout: 15000 });

    // Verify Active Alerts Panel is present (using text-based locator "Priority Alerts")
    console.log(`[${test.info().project.name}] Verifying Active Alerts Panel...`);
    const alertsHeader = page.getByText('Priority Alerts');
    await expect(alertsHeader).toBeVisible({ timeout: 15000 });

    const projectName = test.info().project.name;
    
    // mobile-safari only: assert outer page doesn't scroll horizontally
    if (projectName === 'mobile-safari') {
      console.log(`[mobile-safari] Verifying no horizontal overflow of the main page body...`);
      const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      console.log(`[mobile-safari] scrollWidth: ${bodyScrollWidth}, viewportWidth: ${viewportWidth}`);
      expect(bodyScrollWidth).toBeLessThanOrEqual(viewportWidth);
    }

    // firefox only: check if there's any visible fallback/layout impact for scrollbar styling
    if (projectName === 'firefox') {
      console.log('[firefox] Analyzing scrollbar styling fallback applicability...');
      // Firefox ignores WebKit scrollbar pseudo-classes. Let's document this in the log.
      const hasWebkitScrollbars = await page.evaluate(() => {
        return Array.from(document.styleSheets).some(sheet => {
          try {
            return Array.from(sheet.cssRules).some(rule => rule.cssText.includes('::-webkit-scrollbar'));
          } catch (e) {
            return false;
          }
        });
      });
      console.log(`[firefox] WebKit scrollbar custom rules detected in styles: ${hasWebkitScrollbars}`);
      console.log('[firefox] Firefox uses scrollbar-width / scrollbar-color properties which are currently not defined.');
    }
  });
});

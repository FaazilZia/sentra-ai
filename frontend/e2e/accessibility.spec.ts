/**
 * WCAG 2.1 AA Accessibility Audit — Item 23
 * ==========================================
 * Uses @axe-core/playwright to audit every major page after login.
 * The test FAILS if axe reports ANY critical or serious violation.
 *
 * Disabled rules:
 *  - 'color-contrast'  — chart/dashboard colors rely on the design system;
 *                        tracked separately (branded palette is APCA-checked by design).
 *
 * CI: This spec runs as part of the e2e job. The job fails if violations are found.
 */

import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// ── Constants ─────────────────────────────────────────────────────────────────
const ADMIN_EMAIL = 'admin@sentra.ai';
const ADMIN_PASS  = process.env.TEST_ADMIN_PASSWORD || 'CHANGE_ME_TEST_PASSWORD';

// ── Helpers ───────────────────────────────────────────────────────────────────
async function loginAsAdmin(page: Page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASS);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/app/, { timeout: 30_000 });
  // Wait for the sidebar to appear before running axe (avoids spinner-only snapshots)
  await expect(page.locator('aside')).toBeVisible({ timeout: 15_000 });
}

/**
 * Run axe against the current page state.
 * Only CRITICAL and SERIOUS impact violations cause a hard failure.
 * MODERATE and MINOR are surfaced as warnings in the test output.
 */
async function auditA11y(page: Page, pageLabel: string) {
  const results = await new AxeBuilder({ page })
    // Target WCAG 2.1 Level A and Level AA rules
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    // Exclude color-contrast — tracked separately via design-system audit
    .disableRules(['color-contrast'])
    .analyze();

  // Separate by impact
  const critical = results.violations.filter(v => v.impact === 'critical');
  const serious  = results.violations.filter(v => v.impact === 'serious');
  const moderate = results.violations.filter(v => v.impact === 'moderate');
  const minor    = results.violations.filter(v => v.impact === 'minor');

  // Surface warnings for moderate/minor in output (non-blocking)
  if (moderate.length + minor.length > 0) {
    const list = [...moderate, ...minor]
      .map(v => `  [${v.impact?.toUpperCase()}] ${v.id}: ${v.description} (${v.nodes.length} node(s))`)
      .join('\n');
    console.warn(`\n⚠  Non-blocking a11y findings on "${pageLabel}":\n${list}`);
  }

  // Build a human-readable error message for critical + serious failures
  const blocking = [...critical, ...serious];
  if (blocking.length > 0) {
    const details = blocking
      .map(v => {
        const nodeList = v.nodes
          .slice(0, 3)
          .map(n => `      selector: ${n.target.join(' ')}`)
          .join('\n');
        return `  [${v.impact?.toUpperCase()}] ${v.id}: ${v.description}\n${nodeList}`;
      })
      .join('\n\n');
    throw new Error(
      `WCAG 2.1 AA violation(s) on "${pageLabel}" — ${blocking.length} critical/serious:\n\n${details}`,
    );
  }
}

// ── Test Suite ────────────────────────────────────────────────────────────────
test.describe('WCAG 2.1 AA — Accessibility Audit', () => {
  // Allow longer timeout for axe analysis on complex pages
  test.setTimeout(60_000);

  // ── Public routes ──────────────────────────────────────────────────────────
  test('Login page — zero critical/serious violations', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    // Let the form fully render
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10_000 });
    await auditA11y(page, 'Login');
  });

  // ── Authenticated routes ───────────────────────────────────────────────────
  test.describe('Authenticated pages', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test('Dashboard (/app) — zero critical/serious violations', async ({ page }) => {
      await page.goto('/app', { waitUntil: 'domcontentloaded' });
      // Brief pause for lazy-loaded panels to hydrate
      await page.waitForTimeout(2_000);
      await auditA11y(page, 'Dashboard');
    });

    test('Risk Center (/app/risk) — zero critical/serious violations', async ({ page }) => {
      await page.goto('/app/risk', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2_000);
      await auditA11y(page, 'Risk Center');
    });

    test('Compliance (/app/compliance) — zero critical/serious violations', async ({ page }) => {
      await page.goto('/app/compliance', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2_000);
      await auditA11y(page, 'Compliance');
    });

    test('Policies (/app/policies) — zero critical/serious violations', async ({ page }) => {
      await page.goto('/app/policies', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2_000);
      await auditA11y(page, 'Policies');
    });

    test('Settings (/app/settings) — zero critical/serious violations', async ({ page }) => {
      await page.goto('/app/settings', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2_000);
      await auditA11y(page, 'Settings');
    });
  });
});

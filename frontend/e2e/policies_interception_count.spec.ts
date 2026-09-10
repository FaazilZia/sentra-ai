import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const ARTIFACT_DIR = path.resolve(process.cwd(), 'e2e/screenshots');

test.describe('Policies & Guardrails Interception Count & Zero-State Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.route('**/user/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-user-id',
          email: 'admin@sentra.ai',
          fullName: 'Security Lead',
          role: 'ADMIN',
          organizationId: 'org-test-policies',
          organizationName: 'Sentraa Policy Corp',
          is_active: true,
        }),
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem('sentra_onboarded', 'true');
    });
  });

  test('Fresh Org: Interceptions Today is 0 (NOT 149) and displays calm empty state when disconnected', async ({ page }) => {
    // SDK Status: disconnected
    await page.route('**/organizations/sdk-status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { connected: false, connectedAt: null, firstConnectedAt: null }
        })
      });
    });

    // 0 violations from backend dashboard stats
    await page.route('**/ai/dashboard-stats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          kpis: {
            modelsBlockedToday: { value: 0 },
            blockedCount: { value: 0 },
            complianceScore: { value: 0 }
          }
        })
      });
    });

    await page.goto('/app/policies', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Policies & Guardrails' })).toBeVisible({ timeout: 15000 });

    // CRITICAL: Interceptions Today card must show 0 (NOT 149!)
    const interceptionsCard = page.locator('div').filter({ hasText: /^Interceptions Today/ }).first();
    await expect(interceptionsCard).toBeVisible();
    await expect(interceptionsCard).toContainText('0');
    await expect(interceptionsCard).toContainText('Awaiting SDK Connection');
    await expect(interceptionsCard).not.toContainText('149');

    // Active Governance Rules card should state "Policies active — awaiting agent traffic to enforce"
    const activeRulesCard = page.locator('div').filter({ hasText: /^Active Governance Rules/ }).first();
    await expect(activeRulesCard).toBeVisible();
    await expect(activeRulesCard).toContainText('Policies active — awaiting agent traffic to enforce');

    // Capture screenshot
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'policies_interceptions_zero.png'), fullPage: true });
  });

  test('Live Traffic: Interceptions Today updates to real count from backend telemetry', async ({ page }) => {
    // SDK Status: connected
    await page.route('**/organizations/sdk-status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { connected: true, connectedAt: '2026-09-01T12:00:00Z', firstConnectedAt: '2026-09-01T12:00:00Z' }
        })
      });
    });

    // 17 real blocked violations from live telemetry
    await page.route('**/ai/dashboard-stats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          kpis: {
            modelsBlockedToday: { value: 17 },
            blockedCount: { value: 17 },
            complianceScore: { value: 85 }
          }
        })
      });
    });

    await page.goto('/app/policies', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Policies & Guardrails' })).toBeVisible({ timeout: 15000 });

    const interceptionsCard = page.locator('div').filter({ hasText: /^Interceptions Today/ }).first();
    await expect(interceptionsCard).toContainText('17');
    await expect(interceptionsCard).toContainText('Actions blocked / flagged');

    // Capture screenshot
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'policies_interceptions_live.png'), fullPage: true });
  });
});

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const ARTIFACT_DIR = path.resolve(process.cwd(), 'e2e/screenshots');

test.describe('Agents & Overview Synchronization & SDK Connection Awareness', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // Mock Auth & User session
    await page.route('**/user/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-user-id',
          email: 'admin@sentra.ai',
          fullName: 'Security Lead',
          role: 'ADMIN',
          organizationId: 'org-test-sync',
          organizationName: 'Sentraa Sync Corp',
          is_active: true,
        }),
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem('sentra_onboarded', 'true');
    });
  });

  test('Fresh Org (0 Agents, Disconnected SDK): Overview & Agents show matching 0 count and calm empty states', async ({ page }) => {
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

    // 0 AI systems in database
    await page.route('**/ai-systems', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [] })
      });
    });

    // 0 shadow incidents
    await page.route('**/shadow-ai/detections', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ incidents: [] })
      });
    });

    // 1. Visit Overview Page
    await page.goto('/app/overview', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible({ timeout: 15000 });

    // Overview "Agents Monitored" KPI should be 0 (NOT 24!)
    const agentsKpiCard = page.locator('div').filter({ hasText: /^Agents Monitored/ }).first();
    await expect(agentsKpiCard).toBeVisible();
    await expect(agentsKpiCard).toContainText('0');
    await expect(agentsKpiCard).toContainText('Awaiting SDK Connection');

    // Posture Score should show "—" (NOT "88%" or "0%")
    const postureCard = page.locator('div').filter({ hasText: /^Posture Score/ }).first();
    await expect(postureCard).toContainText('—');
    await expect(postureCard).toContainText('Awaiting SDK Connection');

    // Compliance snapshot should show "—" and "Awaiting Connection" badges
    await expect(page.getByText('Awaiting Connection').first()).toBeVisible();

    // 2. Visit Agents Page
    await page.goto('/app/agents', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Agents' })).toBeVisible({ timeout: 15000 });

    // Total Agents Monitored card should be 0
    const totalAgentsCard = page.locator('div').filter({ hasText: /^Total Agents Monitored/ }).first();
    await expect(totalAgentsCard).toContainText('0');
    await expect(totalAgentsCard).toContainText('Awaiting SDK Connection');

    // Verify mock shadow agents (shadow-demo-1, shadow-demo-2) are NOT present!
    await expect(page.getByText('Shadow AutoGPT Assistant')).toHaveCount(0);
    await expect(page.getByText('Unverified CodeLlama Extension')).toHaveCount(0);

    // Verify calm empty state in inventory table
    await expect(page.getByText('No agents monitored yet — Awaiting SDK Connection')).toBeVisible();

    // Capture screenshot
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'agents_overview_sync_empty.png'), fullPage: true });
  });

  test('Populated Org (2 Agents, Connected SDK): Overview & Agents show matching 2 count and active telemetry', async ({ page }) => {
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

    // 2 Real AI systems in database
    const realSystems = [
      { id: 'sys-1', name: 'Finance Agent Pro', vendor: 'Sentra SDK', risk_tier: 'HIGH', status: 'ACTIVE' },
      { id: 'sys-2', name: 'Customer Support Bot', vendor: 'LangChain', risk_tier: 'LOW', status: 'ACTIVE' }
    ];

    await page.route('**/ai-systems', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: realSystems })
      });
    });

    await page.route('**/shadow-ai/detections', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ incidents: [] })
      });
    });

    // 1. Visit Overview Page
    await page.goto('/app/overview', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible({ timeout: 15000 });

    const agentsKpiCard = page.locator('div').filter({ hasText: /^Agents Monitored/ }).first();
    await expect(agentsKpiCard).toContainText('2');

    // 2. Visit Agents Page
    await page.goto('/app/agents', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Agents' })).toBeVisible({ timeout: 15000 });

    const totalAgentsCard = page.locator('div').filter({ hasText: /^Total Agents Monitored/ }).first();
    await expect(totalAgentsCard).toContainText('2');

    // Both real agents visible in table
    await expect(page.getByText('Finance Agent Pro')).toBeVisible();
    await expect(page.getByText('Customer Support Bot')).toBeVisible();

    // Still no mock shadow agents
    await expect(page.getByText('Shadow AutoGPT Assistant')).toHaveCount(0);
    await expect(page.getByText('Unverified CodeLlama Extension')).toHaveCount(0);

    // Capture screenshot
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'agents_overview_sync_populated.png'), fullPage: true });
  });
});

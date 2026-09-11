import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const ARTIFACT_DIR = path.resolve(process.cwd(), 'e2e/screenshots');

test.describe('SettingsSection Real Data & Honest Zero States', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // Mock authenticated user session (Admin of a fresh org)
    await page.route('**/api/v1/user/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'admin-user-001',
          email: 'founder@freshcorp.ai',
          fullName: 'Alice Founder',
          role: 'ADMIN',
          organizationId: 'org-fresh-001',
          organizationName: 'FreshCorp AI',
          is_active: true,
        }),
      });
    });

    await page.route('**/api/v1/organizations/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'org-fresh-001',
          name: 'FreshCorp AI',
        }),
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem('sentra_onboarded', 'true');
      localStorage.setItem('sentra_token', 'fake-jwt-token');
    });

    if (!fs.existsSync(ARTIFACT_DIR)) {
      fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    }
  });

  test('Fresh Org: Team has only registered admin, Vendors is empty, API Keys has empty state', async ({ page }) => {
    // 1. Mock GET /users: only the registered admin
    await page.route('**/api/v1/users', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'admin-user-001',
              full_name: 'Alice Founder',
              email: 'founder@freshcorp.ai',
              role: 'ADMIN',
              created_at: '2026-09-01T10:00:00.000Z'
            }
          ]
        })
      });
    });

    // 2. Mock GET /vendors: empty list
    await page.route('**/api/v1/vendors', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: []
        })
      });
    });

    // 3. Mock GET /admin/api-keys: empty list
    await page.route('**/api/v1/admin/api-keys', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: []
          })
        });
      } else if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'key-new-fresh-01',
              name: 'New API Key #1',
              api_key: 'sentra_fresh_live_key_a1b2c3d4e5f6',
              key_prefix: 'fresh_live'
            }
          })
        });
      } else {
        await route.continue();
      }
    });

    // Navigate to Settings
    await page.goto('/app/settings', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible({ timeout: 15000 });

    // --- Verify Tab 2: Team & Organization ---
    const teamTab = page.getByRole('tab', { name: /Team/i });
    await expect(teamTab).toBeVisible();
    await teamTab.click();

    // Verify only 1 member: Alice Founder
    await expect(page.getByRole('table').getByText('Alice Founder')).toBeVisible();
    await expect(page.getByRole('table').getByText('founder@freshcorp.ai')).toBeVisible();

    // Assert fake seed members are NOT present
    await expect(page.getByText('Security Operations Lead')).toHaveCount(0);
    await expect(page.getByText('DevOps Engineer')).toHaveCount(0);
    await expect(page.getByText('soc-lead@sentraa.ai')).toHaveCount(0);

    // --- Verify Tab 3: Vendor Risk Assessment ---
    const vendorsTab = page.getByRole('tab', { name: /Vendor Risk/i });
    await expect(vendorsTab).toBeVisible();
    await vendorsTab.click();

    // Verify tab count badge is 0
    await expect(vendorsTab).toContainText('0');

    // Verify empty state message
    await expect(page.getByText('No third-party vendor risk assessments added yet.')).toBeVisible();

    // Assert fake seed vendors are NOT present
    await expect(page.getByText('OpenAI API Platform')).toHaveCount(0);
    await expect(page.getByText('Anthropic Claude Engine')).toHaveCount(0);
    await expect(page.getByText('Pinecone Vector Database')).toHaveCount(0);

    // --- Verify Tab 4: API Keys & Security ---
    const apiKeysTab = page.getByRole('tab', { name: /API Keys/i });
    await expect(apiKeysTab).toBeVisible();
    await apiKeysTab.click();

    // Verify tab count badge is 0
    await expect(apiKeysTab).toContainText('0');

    // Verify calm empty state card is displayed
    const emptyStateCard = page.locator('[data-testid="api-keys-empty-state"]');
    await expect(emptyStateCard).toBeVisible();
    await expect(emptyStateCard).toContainText('No API Keys Generated');

    // Assert fake seed API keys are NOT present
    await expect(page.getByText('Production Pipeline Key')).toHaveCount(0);
    await expect(page.getByText('Dev Staging Key')).toHaveCount(0);
    await expect(page.getByText('sentra_98a4bc12...')).toHaveCount(0);

    // Test Generating an API Key from the empty state button
    const generateBtn = emptyStateCard.getByRole('button', { name: /Generate API Key/i });
    await expect(generateBtn).toBeVisible();
    await generateBtn.click();

    // Reveal modal should open
    await expect(page.locator('[data-testid="api-key-reveal-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="created-full-api-key-display"]')).toContainText('sentra_fresh_live_key_a1b2c3d4e5f6');

    // Close modal
    await page.locator('[data-testid="done-button"]').click();
    await expect(page.locator('[data-testid="api-key-reveal-modal"]')).toHaveCount(0);

    // Empty state should be gone, and new key should be listed with permanent masking
    await expect(page.locator('[data-testid="api-keys-empty-state"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="api-keys-list"]').getByRole('heading', { name: 'New API Key #1' })).toBeVisible();
    await expect(page.locator('[data-testid="api-key-masked-value"]')).toBeVisible();
    expect(await page.locator('[data-testid="api-key-masked-value"]').innerText()).toContain('••••');
    await expect(page.locator('[data-testid="api-key-zero-trust-banner"]')).toBeVisible();
  });
});

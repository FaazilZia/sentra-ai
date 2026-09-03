import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const ARTIFACT_DIR = path.resolve(process.cwd(), 'e2e/screenshots');

const MOCK_EXISTING_KEYS = {
  success: true,
  data: {
    data: [
      {
        id: 'key-prod-001',
        name: 'Production Pipeline Key',
        key_prefix: '98a4bc12',
        created_at: '2026-07-01T10:00:00.000Z'
      },
      {
        id: 'key-stage-002',
        name: 'Dev Staging Key',
        key_prefix: '41b9ef08',
        created_at: '2026-08-05T15:30:00.000Z'
      }
    ],
    total: 2
  }
};

const MOCK_NEW_KEY_RESPONSE = {
  success: true,
  data: {
    id: 'key-new-778899',
    name: 'New API Key #3',
    api_key: 'sentra_6ebf5ae1_h8Ks9LmP2QwR5tY1uI4oP7aS0dF3gH6j',
    key_prefix: '6ebf5ae1'
  }
};

test.describe('Settings API Keys: Generation & One-Time Full Key Reveal', () => {
  test.beforeEach(async ({ page, context }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // Grant clipboard permissions for reading and writing
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Mock authentication and organization
    await page.route('**/api/v1/user/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-admin-id',
          email: 'admin@sentra.ai',
          fullName: 'Security Auditor',
          role: 'ADMIN',
          organizationId: 'org-test-1',
          organizationName: 'Sentraa Enterprise',
          is_active: true,
        }),
      });
    });

    await page.route('**/api/v1/organizations/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'org-test-1',
          name: 'Sentraa Enterprise',
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

  test('Full Key Reveal & Clipboard Verification via Backend API', async ({ page }) => {
    // Mock GET /admin/api-keys
    await page.route('**/api/v1/admin/api-keys', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_EXISTING_KEYS)
        });
      } else if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_NEW_KEY_RESPONSE)
        });
      } else {
        await route.continue();
      }
    });

    // Mock DELETE /admin/api-keys/:id
    await page.route('**/api/v1/admin/api-keys/*', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'API key revoked' })
        });
      } else {
        await route.continue();
      }
    });

    // 1. Navigate to Settings page
    await page.goto('/app/settings', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible({ timeout: 15000 });

    // 2. Click the "API Keys & Security" tab
    const apiKeysTab = page.getByRole('tab', { name: /API Keys/i });
    await expect(apiKeysTab).toBeVisible();
    await apiKeysTab.click();

    // Verify Tab 4 header
    await expect(page.getByText('Workspace API Secret Keys')).toBeVisible();

    // Verify existing keys are masked
    const existingPrefixes = page.locator('[data-testid="api-key-prefix-badge"]');
    await expect(existingPrefixes.first()).toBeVisible();
    const firstPrefixText = await existingPrefixes.first().innerText();
    expect(firstPrefixText).toContain('sentra_98a4bc12...');
    expect(firstPrefixText).not.toContain('_h8Ks9LmP');

    // 3. Click "Generate API Key"
    const generateBtn = page.locator('[data-testid="generate-api-key-btn"]');
    await expect(generateBtn).toBeVisible();
    await generateBtn.click();

    // 4. One-Time Full Key Reveal Modal should appear
    const modal = page.locator('[data-testid="api-key-reveal-modal"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Verify modal title and critical security notice
    await expect(page.getByText('API Key Generated')).toBeVisible();
    await expect(page.getByText('Save your secret key now.')).toBeVisible();

    // 5. Assert the FULL key is present in the DOM (not truncated)
    const keyInput = page.locator('[data-testid="created-full-api-key-input"]');
    await expect(keyInput).toBeVisible();
    const fullKeyInputValue = await keyInput.inputValue();

    const keyDisplay = page.locator('[data-testid="created-full-api-key-display"]');
    await expect(keyDisplay).toBeVisible();
    const fullKeyDisplayText = await keyDisplay.innerText();

    // The key must equal the full generated secret (48 chars, starting with sentra_)
    expect(fullKeyInputValue).toBe(MOCK_NEW_KEY_RESPONSE.data.api_key);
    expect(fullKeyDisplayText.trim()).toBe(MOCK_NEW_KEY_RESPONSE.data.api_key);
    expect(fullKeyInputValue.length).toBeGreaterThanOrEqual(40);
    expect(fullKeyInputValue).toMatch(/^sentra_[a-f0-9]{8}_[A-Za-z0-9_-]+$/);

    // CRITICAL: Verify it is NOT just a truncated prefix
    expect(fullKeyInputValue).not.toBe('sentra_6ebf5ae1...');
    expect(fullKeyInputValue).not.toBe('sen_live_6ebf5ae1...');

    // 6. Capture screenshot showing full key at creation time
    const screenshotPath = path.join(ARTIFACT_DIR, 'api_key_created_full_display.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    expect(fs.existsSync(screenshotPath)).toBe(true);

    // 7. Click "Copy full key" button and assert clipboard content
    const copyFullKeyBtn = page.locator('[data-testid="copy-full-key-button"]');
    await expect(copyFullKeyBtn).toBeVisible();
    await copyFullKeyBtn.click();

    // Button updates state to "Copied!"
    await expect(page.getByText('Copied!')).toBeVisible();

    // Verify exact clipboard content matches the full key
    const clipboardContent = await page.evaluate(async () => {
      return await navigator.clipboard.readText();
    });
    expect(clipboardContent).toBe(MOCK_NEW_KEY_RESPONSE.data.api_key);

    // 8. Close the modal by clicking "I have saved my key"
    const doneBtn = page.locator('[data-testid="done-button"]');
    await expect(doneBtn).toBeVisible();
    await doneBtn.click();

    // Modal should disappear
    await expect(modal).toBeHidden();

    // 9. Subsequent view: the key list shows the masked version ONLY
    const newKeyRow = page.locator(`[data-testid="api-key-row-${MOCK_NEW_KEY_RESPONSE.data.id}"]`);
    await expect(newKeyRow).toBeVisible();
    const displayedPrefix = await newKeyRow.locator('[data-testid="api-key-prefix-badge"]').innerText();
    expect(displayedPrefix).toBe('sentra_6ebf5ae1...');

    // The unmasked secret must NEVER be visible in the table row
    const rowText = await newKeyRow.innerText();
    expect(rowText).not.toContain('h8Ks9LmP2QwR5tY1uI4oP7aS0dF3gH6j');

    // 10. Test Revoke Key
    const revokeBtn = newKeyRow.locator('[data-testid="revoke-key-button"]');
    await expect(revokeBtn).toBeVisible();
    await revokeBtn.click();

    // Key row is removed
    await expect(newKeyRow).toBeHidden();
  });

  test('Fallback Generation: produces full valid sentra_ key when backend call is offline', async ({ page }) => {
    // Simulate backend POST failure
    await page.route('**/api/v1/admin/api-keys', async (route) => {
      if (route.request().method() === 'POST') {
        await route.abort('failed');
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_EXISTING_KEYS)
        });
      }
    });

    await page.goto('/app/settings', { waitUntil: 'networkidle' });
    await page.getByRole('tab', { name: /API Keys/i }).click();

    // Generate API Key with backend failure
    await page.locator('[data-testid="generate-api-key-btn"]').click();

    // Modal still opens with a valid cryptographic full key
    const modal = page.locator('[data-testid="api-key-reveal-modal"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    const keyInput = page.locator('[data-testid="created-full-api-key-input"]');
    const generatedKey = await keyInput.inputValue();

    // Assert format and length
    expect(generatedKey.startsWith('sentra_')).toBe(true);
    expect(generatedKey.length).toBeGreaterThanOrEqual(40);
    expect(generatedKey).toMatch(/^sentra_[a-f0-9]{8}_[A-Za-z0-9_-]+$/);

    // Verify copy button works with fallback key
    await page.locator('[data-testid="copy-full-key-button"]').click();
    const clipboardContent = await page.evaluate(async () => {
      return await navigator.clipboard.readText();
    });
    expect(clipboardContent).toBe(generatedKey);

    // Dismiss modal
    await page.locator('[data-testid="done-button"]').click();
    await expect(modal).toBeHidden();
  });
});

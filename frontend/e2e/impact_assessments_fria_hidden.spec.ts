import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const ARTIFACT_DIR = '/Users/mohammadfaazilzia/.gemini/antigravity/brain/a251c097-8092-4f89-a6b3-ee40007dc630';

test('Impact Assessments page: FRIA button & tab hidden, DPIA/AIA flow functional', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });

  // 1. Mock Auth and API endpoints
  await page.route('**/user/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'demo-admin-id',
        email: 'demo.admin@sentra.ai',
        fullName: 'Demo Administrator',
        role: 'ADMIN',
        organizationId: 'demo-org-1',
        organizationName: 'Sentraa AI Demo',
        is_active: true,
      }),
    });
  });

  await page.route('**/organizations/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'demo-org-1',
        name: 'Sentraa AI Demo',
      }),
    });
  });

  await page.route('**/governance/impact-assessments', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 'dpia-001',
              type: 'DPIA',
              status: 'IN_REVIEW',
              form_data: {
                description: 'Customer Support LLM analyzing user queries for sentiment and routing.',
                benefits: 'Decreases resolution times by 45%.',
                data_protection: 'End-to-end encryption with tenant token pseudonymization.',
                oversight: 'Human-in-the-loop review for flagged escalation cases.',
              },
              submitted_by: 'compliance.lead@sentra.ai',
              reviewed_by: null,
              approved_at: null,
              created_at: new Date().toISOString(),
              ai_system: {
                id: 'sys-101',
                name: 'Customer Support Agent V2',
                risk_tier: 'HIGH',
              },
            },
          ],
        }),
      });
    } else {
      await route.fallback();
    }
  });

  await page.route('**/ai-systems', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [
          { id: 'sys-101', name: 'Customer Support Agent V2', risk_tier: 'HIGH' },
          { id: 'sys-102', name: 'Fraud Detection Pipeline', risk_tier: 'MEDIUM' },
        ],
      }),
    });
  });

  // Bypass onboarding modal in localStorage
  await page.addInitScript(() => {
    localStorage.setItem('sentra_onboarded', 'true');
  });

  // 2. Navigate directly to Impact Assessments
  await page.goto('/app/impact-assessments', { waitUntil: 'networkidle' });

  // 3. Verify Page Loaded Cleanly
  await expect(page.getByRole('heading', { name: 'Impact Assessments' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('DPIA / AIA Kanban Board')).toBeVisible();

  // 4. Verify Launch DPIA/AIA Button is Present
  const launchDpiaBtn = page.getByRole('button', { name: /Launch DPIA\/AIA/i });
  await expect(launchDpiaBtn).toBeVisible();

  // 5. Verify ALL FRIA entry points are COMPLETELY GONE
  await expect(page.getByRole('button', { name: /Launch FRIA/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Launch EU AI Act FRIA/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /EU AI Act FRIA/i })).toHaveCount(0);
  await expect(page.getByText(/EU AI Act FRIA assessments/i)).toHaveCount(0);
  await expect(page.getByText(/Fundamental Rights Impact Assessments/i)).toHaveCount(0);
  await expect(page.getByText(/Article 27 FRIA/i)).toHaveCount(0);

  // 6. Test DPIA/AIA Modal Flow
  await launchDpiaBtn.click();
  const modalHeading = page.getByRole('heading', { name: 'Launch Impact Assessment' });
  await expect(modalHeading).toBeVisible();

  // Verify dropdown options
  const systemSelect = page.locator('#target-ai-system');
  await expect(systemSelect).toBeVisible();
  await expect(systemSelect).toContainText('Customer Support Agent V2 (HIGH Risk)');

  // Close the modal
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(modalHeading).not.toBeVisible();

  // 7. Verify DPIA/AIA card exists on Kanban Board
  await expect(page.getByText('Customer Support Agent V2')).toBeVisible();

  // 8. Capture proof screenshot
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const screenshotPath = path.join(ARTIFACT_DIR, 'impact_assessments_demo_ready.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`📸 Saved screenshot proof to: ${screenshotPath}`);
});

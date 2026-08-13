import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = '/Users/mohammadfaazilzia/Desktop/Sentra AI/screenshots';
const DEMO_EMAIL = 'demo.admin@sentra.ai';
const DEMO_PASS = 'DemoAdminSecurePassword123!';

test.describe.configure({ mode: 'serial' });

test('Capture real visual screenshots of all 9 authenticated sections without onboarding modal', async ({ page }) => {
  test.setTimeout(180000);
  
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });

  // 1. Perform Authentication
  console.log('🔑 Logging in as demo administrator...');
  await page.goto('/login', { waitUntil: 'networkidle' });
  
  await page.fill('input[type="email"]', DEMO_EMAIL);
  await page.fill('input[type="password"]', DEMO_PASS);
  await page.click('button[type="submit"]');

  // Wait for redirect to /app
  await expect(page).toHaveURL(/\/app/, { timeout: 30000 });
  
  // Set sentra_onboarded to true in localStorage so wizard never pops up again
  await page.evaluate(() => {
    localStorage.setItem('sentra_onboarded', 'true');
  });

  // Helper to dismiss onboarding modal if visible
  const dismissModal = async () => {
    try {
      const modalCloseBtn = page.locator('button:has(svg.lucide-x), text="Quick Setup Guide" ~ button, text="Dismiss", text="Skip"').first();
      if (await modalCloseBtn.isVisible({ timeout: 1000 })) {
        await modalCloseBtn.click();
        await page.waitForTimeout(500);
      }
    } catch (e) {
      // Ignore if modal not present
    }
  };

  await dismissModal();
  await page.waitForTimeout(1000);
  console.log('✅ Authentication & Modal Dismissal successful!');

  const routes = [
    { path: '/app', baseName: '01_Overview', pageName: '1. Overview' },
    { path: '/app/agents', baseName: '02_Agents', pageName: '2. Agents' },
    { path: '/app/policies', baseName: '03_Policies_Guardrails', pageName: '3. Policies & Guardrails' },
    { path: '/app/compliance', baseName: '04_Compliance', pageName: '4. Compliance' },
    { path: '/app/risk', baseName: '05_Risk', pageName: '5. Risk' },
    { path: '/app/activity', baseName: '06_Activity', pageName: '6. Activity' },
    { path: '/app/evidence', baseName: '07_Evidence_Reports', pageName: '7. Evidence & Reports' },
    { path: '/app/advisor', baseName: '08_AI_Advisor', pageName: '8. AI Advisor' },
    { path: '/app/settings', baseName: '09_Settings', pageName: '9. Settings' }
  ];

  for (const route of routes) {
    console.log(`📸 Navigating to: ${route.pageName} (${route.path})...`);
    await page.goto(route.path, { waitUntil: 'networkidle' });
    
    // Ensure sentra_onboarded flag persists in localStorage
    await page.evaluate(() => {
      localStorage.setItem('sentra_onboarded', 'true');
    });

    await dismissModal();
    await page.waitForTimeout(1500);

    // Confirm we didn't bounce back to login
    expect(page.url()).not.toContain('/login');

    const fileName = `${route.baseName}.png`;
    const filePath = path.join(SCREENSHOT_DIR, fileName);
    await page.screenshot({ path: filePath, fullPage: false });
    console.log(`   ✅ Clean Section Screenshot saved: ${filePath}`);
  }
});

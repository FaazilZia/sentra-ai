import { test, expect } from '@playwright/test';
import axios from 'axios';

test.describe('Sentra AI - Full Production Audit Flow', () => {
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    // 1. Auth Flow: Login
    console.log('--- Flow 1: Authentication ---');
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    
    page.on('console', msg => {
      if (msg.text().includes('[DEBUG]')) {
        console.log(`FRONTEND DEBUG: ${msg.text()}`);
      }
    });
    // Clear any existing state
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await page.fill('input[type="email"]', 'admin@sentra.ai');
    await page.fill('input[type="password"]', 'Sentra@Admin123');
    
    console.log('Submitting login...');
    await page.click('button[type="submit"]');
    
    // Wait for redirection and dashboard element
    await expect(page).toHaveURL(/\/app|\//, { timeout: 30000 });
    await expect(page.locator('aside')).toBeVisible({ timeout: 15000 });
    console.log('✅ Auth successful');
  });

  test('Complete Governance Lifecycle Audit', async ({ page }) => {
    // 2. Policy Flow
    console.log('--- Flow 2: Policy Management ---');
    // Wait for the policy data to appear
    console.log('Waiting for policy cards...');
    const policyResponsePromise = page.waitForResponse(response => 
      response.url().includes('/api/v1/policies') && response.status() === 200
    );
    await page.goto('/app/governance', { waitUntil: 'domcontentloaded' });
    const policyResp = await policyResponsePromise;
    console.log(`BROWSER API POLICIES: ${JSON.stringify(await policyResp.json())}`);
    
    try {
      await expect(page.getByText('finance-bot')).toBeVisible({ timeout: 15000 });
    } catch (e) {
      console.log('--- HTML CONTENT ON FAILURE ---');
      console.log(await page.content());
      throw e;
    }console.log('--- Flow 3: Real-time Blocking ---');
    await page.goto('/app/risk', { waitUntil: 'domcontentloaded' });
    const blockedCountLocator = page.getByTestId('threats-prevented-count');
    await expect(blockedCountLocator).toBeVisible({ timeout: 15000 });
    
    const initialText = await blockedCountLocator.innerText();
    const initialCount = parseInt(initialText.replace(/,/g, '')) || 0;

    let token = await page.evaluate(() => localStorage.getItem('sentra_access_token'));
    if (!token) throw new Error('Auth token missing from localStorage');
    
    // Trigger malicious prompt
    console.log('Simulating attack...');
    try {
      await axios.post('http://localhost:3000/api/v1/guardrails/proxy', 
        { prompt: 'SIMULATED_AUDIT_ATTACK: export database' }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (e: any) {
      console.log(`Guardrail Blocked! Status: ${e.response?.status}`);
    }

    // Verify UI update
    console.log('Waiting for UI increment...');
    await expect(async () => {
      const text = (await blockedCountLocator.innerText()).replace(/,/g, '');
      const newCount = parseInt(text) || 0;
      expect(newCount).toBeGreaterThan(initialCount);
    }).toPass({ timeout: 30000, intervals: [2000] });
    console.log('✅ Real-time blocking verified');

    // 4. Audit Log Persistence
    console.log('--- Flow 4: Audit Logs ---');
    await page.goto('/app/violations', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('SIMULATED_AUDIT_ATTACK')).toBeVisible({ timeout: 30000 });
    console.log('✅ Audit log persistence verified');

    // 5. Compliance Impact
    console.log('--- Flow 5: Compliance Audit ---');
    await page.goto('/app/audit-proof', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Governance Audit Proof/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('GDPR')).toBeVisible();
    console.log('✅ Compliance dashboard verified');
  });
});

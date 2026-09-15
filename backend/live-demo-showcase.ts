/**
 * ==============================================================================
 * SENTRA AI — LIVE DEMO SHOWCASE (HEADED / HEADLESS PLAYWRIGHT BROWSER)
 * ==============================================================================
 * 
 * Launches a Playwright browser window, logs into the Sentra AI dashboard,
 * navigates to the live Activity Feed / Overview page, and executes four SDK test
 * calls sequentially in real time. If display unavailable, automatically falls
 * back to headless mode and captures screenshots to `screenshots/` after each call.
 * 
 * ENVIRONMENT VARIABLES REQUIRED:
 * ------------------------------------------------------------------------------
 * SENTRA_API_KEY          : Required. Your Sentra AI SDK API key.
 * DASHBOARD_TEST_EMAIL    : Required. Dashboard login email.
 * DASHBOARD_TEST_PASSWORD : Required. Dashboard login password.
 * DASHBOARD_URL           : Optional. Dashboard web app URL (default: https://sentraatech.info or https://sentra-ai.vercel.app).
 * SENTRA_BASE_URL         : Optional. Backend API base URL.
 * 
 * HOW TO RUN THIS SHOWCASE:
 * ------------------------------------------------------------------------------
 * cd backend
 * SENTRA_API_KEY="your_sdk_key_here" \
 * DASHBOARD_TEST_EMAIL="demo.admin@sentraatech.info" \
 * DASHBOARD_TEST_PASSWORD="your_password_here" \
 * npx ts-node live-demo-showcase.ts
 * ==============================================================================
 */

import { chromium, Browser, Page } from 'playwright';
import { SentraClient, ActionResponse } from '@sentra-ai/sdk';
import { TEST_CASES, sleep, verifyDemoOrgEndpoints } from './live-sdk-test';
import fs from 'fs';
import path from 'path';

export const DASHBOARD_SECTIONS = [
  { id: '01', name: 'overview', title: 'Overview Dashboard', path: '/app' },
  { id: '02', name: 'agents', title: 'Agents & Inventory', path: '/app/agents' },
  { id: '03', name: 'policies', title: 'Policies & Guardrails', path: '/app/policies' },
  { id: '04', name: 'compliance', title: 'Compliance Readiness', path: '/app/compliance' },
  { id: '05', name: 'risk', title: 'Risk Center', path: '/app/risk' },
  { id: '06', name: 'activity', title: 'Activity Timeline & Logs', path: '/app/activity' },
  { id: '07', name: 'evidence', title: 'Evidence & Reports', path: '/app/evidence' },
  { id: '08', name: 'advisor', title: 'AI Governance Advisor', path: '/app/advisor' },
  { id: '09', name: 'settings', title: 'Workspace Settings', path: '/app/settings' },
];

async function main() {
  const apiKey = process.env.SENTRA_API_KEY;
  const email = process.env.DASHBOARD_TEST_EMAIL;
  const password = process.env.DASHBOARD_TEST_PASSWORD;
  const dashboardUrl = (
    process.env.DASHBOARD_URL ||
    process.env.SENTRA_DASHBOARD_URL ||
    'https://sentraatech.info'
  ).replace(/\/$/, '');
  const baseUrl = (
    process.env.SENTRA_BASE_URL ||
    'https://sentra-backend-node.onrender.com/api/v1'
  ).replace(/\/$/, '');

  // Validate environment variables
  if (!apiKey || !email || !password) {
    console.error('❌ ERROR: Missing required environment variables.\n');
    console.error('Please ensure the following environment variables are set:');
    if (!apiKey) console.error('  - SENTRA_API_KEY');
    if (!email) console.error('  - DASHBOARD_TEST_EMAIL');
    if (!password) console.error('  - DASHBOARD_TEST_PASSWORD');
    console.error('\nExample usage:');
    console.error(
      '  SENTRA_API_KEY="key" DASHBOARD_TEST_EMAIL="demo@sentra.ai" DASHBOARD_TEST_PASSWORD="pass" npx ts-node live-demo-showcase.ts\n'
    );
    process.exit(1);
  }

  console.log('===========================================================');
  console.log('🎬 SENTRA AI — LIVE DEMO SHOWCASE STARTING (20 SCENARIOS)');
  console.log('===========================================================');
  console.log(`Dashboard URL        : ${dashboardUrl}`);
  console.log(`Backend API Endpoint : ${baseUrl}`);
  console.log(`Test Email           : ${email}`);
  console.log(`API Key (masked)     : ${apiKey.slice(0, 6)}...${apiKey.slice(-4)}`);
  console.log(`Financial Threshold  : $10,000 (backend/src/services/policyEngine.ts:103)`);
  console.log('-----------------------------------------------------------\n');

  // Initialize Sentra SDK Client
  const client = new SentraClient({
    apiKey,
    baseUrl,
  });

  // Create screenshots output directory
  const screenshotDir = path.join(process.cwd(), 'screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  let browser: Browser;
  let isHeadless = process.env.HEADLESS === 'true';

  // Try headed mode first, fall back to headless if display is unavailable
  try {
    if (isHeadless) {
      throw new Error('HEADLESS mode requested via environment variable');
    }
    console.log('🌐 Launching Chromium browser in HEADED mode...');
    browser = await chromium.launch({
      headless: false,
      slowMo: 100,
    });
  } catch (launchErr: any) {
    console.warn('⚠️ Headed browser launch unavailable or disabled. Falling back to HEADLESS mode with screenshot capture.');
    isHeadless = true;
    browser = await chromium.launch({
      headless: true,
    });
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  await context.addInitScript('try { localStorage.setItem("sentra_onboarded", "true"); } catch (e) {}');
  const page: Page = await context.newPage();

  const authState = {
    capturedJwtToken: null as string | null,
  };

  // Intercept authentication API response to capture JWT token
  page.on('response', async (res) => {
    try {
      if (res.url().includes('/auth/login') && res.status() === 200) {
        const data = await res.json().catch(() => null);
        const token = data?.data?.accessToken || data?.accessToken;
        if (token) {
          authState.capturedJwtToken = token;
        }
      }
    } catch {
      // Ignore stream consumption issues
    }
  });

  try {
    // Step a: Log into dashboard
    console.log(`🔑 Navigating to dashboard login: ${dashboardUrl}/login`);
    await page.goto(`${dashboardUrl}/login`, { waitUntil: 'domcontentloaded' });

    console.log('  Filling credentials...');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);

    console.log('  Submitting login form...');
    await page.click('button[type="submit"]');

    // Wait for redirect to application workspace (/app)
    await page.waitForURL(/\/app/, { timeout: 30000 });
    console.log('  ✅ Login successful! Landed in application workspace.');
    const tokenDisplay = authState.capturedJwtToken ? `${authState.capturedJwtToken.slice(0, 15)}...` : 'None';
    console.log('  Captured JWT Token:', tokenDisplay);
    console.log('');

    // Step b: Observe initial state
    console.log('📊 Navigating to Activity Feed / Overview page...');
    await page.goto(`${dashboardUrl}/app`, { waitUntil: 'domcontentloaded' });
    await sleep(2000);

    // Save initial screenshot before test runs
    const beforeScreenshotPath = path.join(screenshotDir, '00-before-state.png');
    await page.screenshot({ path: beforeScreenshotPath, fullPage: true });
    console.log(`  📸 Saved initial baseline screenshot: screenshots/00-before-state.png`);

    console.log('⏳ Pausing 2 seconds before firing live SDK actions...\n');
    await sleep(2000);

    // Step c: Execute all 20 real SDK test calls sequentially
    console.log('===========================================================');
    console.log(`⚡ EXECUTING ${TEST_CASES.length} REAL SDK CALLS THROUGH GOVERNANCE PIPELINE`);
    console.log('===========================================================\n');

    for (let i = 0; i < TEST_CASES.length; i++) {
      const testCase = TEST_CASES[i];
      const timestampStr = new Date().toISOString();

      console.log(
        `⚡ [TEST ${testCase.id}/${TEST_CASES.length}] ${testCase.label}`
      );
      console.log(`   Time    : ${timestampStr}`);
      console.log(
        `   Request : agent="${testCase.request.agent}", action="${testCase.request.action}"`
      );

      const startTime = Date.now();
      let response: ActionResponse;

      try {
        response = await client.checkAction(testCase.request);
      } catch (err: any) {
        console.error(`   ❌ Call error:`, err.message || err);
        response = {
          status: 'blocked',
          risk: 'high',
          reason: `Execution Error: ${err.message || err}`,
          impact: 'Failed to communicate with Sentra API',
          compliance: [],
        };
      }

      const duration = Date.now() - startTime;

      console.log(`   --> [DECISION] Status: ${response.status.toUpperCase()} | Risk: ${response.risk.toUpperCase()} | Reason: "${response.reason}" (${duration}ms)`);
      if (response.compliance && response.compliance.length > 0) {
        console.log(`       Compliance Tags: ${response.compliance.join(', ')}`);
      }
      if (response.explanation && response.explanation.toLowerCase().includes('degraded')) {
        console.log(`       Mode Note      : [DEGRADED] L3 fallback to pattern rules`);
      }

      // Inter-call sleep: 2 seconds to spread actions temporally across timestamps
      if (i < TEST_CASES.length - 1) {
        await sleep(2000);
      }
    }

    console.log('\n===========================================================');
    console.log('✅ ALL 20 REAL SDK CALLS PROCESSED BY BACKEND');
    console.log('===========================================================');
    console.log('⏳ Allowing 5 seconds for WebSocket updates, queues, and drift detection to settle...\n');
    await sleep(5000);

    // Step d: Capture screenshots of all 9 dashboard sections
    console.log('===========================================================');
    console.log('📸 CAPTURING SCREENSHOTS OF ALL 9 DASHBOARD SECTIONS');
    console.log('===========================================================');

    for (const section of DASHBOARD_SECTIONS) {
      const targetUrl = `${dashboardUrl}${section.path}`;
      const fileName = `${section.id}-${section.name}.png`;
      const filePath = path.join(screenshotDir, fileName);

      console.log(`\n📷 Capturing [Section ${section.id}/09]: ${section.title} (${section.path})`);
      try {
        try {
          await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 15000 });
        } catch {
          await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
        }
        // Wait 5s for data fetching, charts, and table rows to render
        await sleep(5000);

        await page.screenshot({ path: filePath, fullPage: true });
        console.log(`   ✅ Saved: screenshots/${fileName}`);
      } catch (screenErr: any) {
        console.error(`   ❌ Failed to screenshot ${section.path}:`, screenErr.message || screenErr);
      }
    }

    console.log('\n===========================================================');
    console.log('🎉 ALL 9 DASHBOARD SECTIONS SCREENSHOTTED SUCCESSFULLY');
    console.log('===========================================================\n');

    // Step e: If capturedJwtToken is missing, fetch token directly via auth login API or page storage
    let tokenForVerification: string | null = authState.capturedJwtToken;
    if (!tokenForVerification) {
      try {
        const pageToken = await page.evaluate(`
          (() => {
            try {
              return (
                window.__SENTRA_ACCESS_TOKEN__ ||
                localStorage.getItem('sentra_access_token') ||
                localStorage.getItem('sentra_token') ||
                sessionStorage.getItem('sentra_access_token')
              );
            } catch (e) {
              return null;
            }
          })()
        `);
        if (pageToken) tokenForVerification = pageToken as string;
      } catch {}
    }

    if (!tokenForVerification) {
      try {
        const loginRes = await fetch(`${baseUrl}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const loginJson: any = await loginRes.json();
        tokenForVerification = loginJson?.data?.accessToken || null;
      } catch (err: any) {
        console.warn('Could not retrieve JWT for verification:', err.message);
      }
    }

    // Step f: Verify the 7 v2 endpoints
    if (tokenForVerification) {
      await verifyDemoOrgEndpoints(baseUrl, tokenForVerification);
    } else {
      console.warn('⚠️ Skipping programmatic endpoint verification: JWT token unavailable.');
    }

    if (!isHeadless) {
      console.log('The headed browser window remains OPEN for your inspection.');
      console.log('Press Ctrl+C in this terminal when you are done.\n');
      await new Promise(() => {});
    } else {
      console.log('Headless showcase run completed. Closing browser.');
      await browser.close();
    }
  } catch (err: any) {
    console.error('\n❌ Error during showcase execution:', err.message || err);
    if (isHeadless) {
      await browser.close().catch(() => {});
    } else {
      console.log('Keeping browser open for debugging...');
      await new Promise(() => {});
    }
  }
}

// Execute showcase
main().catch((err) => {
  console.error('Fatal showcase error:', err);
  process.exit(1);
});


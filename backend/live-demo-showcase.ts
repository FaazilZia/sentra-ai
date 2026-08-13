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
import { TEST_CASES, sleep } from './live-sdk-test';
import fs from 'fs';
import path from 'path';

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
  console.log('🎬 SENTRA AI — LIVE DEMO SHOWCASE STARTING');
  console.log('===========================================================');
  console.log(`Dashboard URL        : ${dashboardUrl}`);
  console.log(`Backend API Endpoint : ${baseUrl}`);
  console.log(`Test Email           : ${email}`);
  console.log(`API Key (masked)     : ${apiKey.slice(0, 6)}...${apiKey.slice(-4)}`);
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
    viewport: { width: 1280, height: 800 },
  });
  const page: Page = await context.newPage();

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
    console.log('  ✅ Login successful! Landed in application workspace.\n');

    // Step b: Navigate to Activity Feed / Overview page
    console.log('📊 Navigating to Activity Feed / Overview page...');
    await page.goto(`${dashboardUrl}/app`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('aside', { timeout: 15000 });

    // Save initial screenshot before test runs
    const beforeScreenshotPath = path.join(screenshotDir, '00-before-state.png');
    await page.screenshot({ path: beforeScreenshotPath, fullPage: true });
    console.log(`  📸 Saved screenshot: screenshots/00-before-state.png`);

    // Step c: Wait 3 seconds to present "before" state
    console.log('⏳ Pausing 3 seconds to observe initial "BEFORE" state on dashboard...');
    await sleep(3000);
    console.log('  ✅ Initial state observed. Starting SDK test execution...\n');

    // Step d: Execute all 4 SDK test calls from Part 1, waiting 2-3s between each
    for (let i = 0; i < TEST_CASES.length; i++) {
      const testCase = TEST_CASES[i];

      console.log(
        `⚡ [TEST ${testCase.id}/4] Firing SDK Call: ${testCase.label}`
      );
      console.log(
        `   Request: agent="${testCase.request.agent}", action="${testCase.request.action}"`
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

      console.log(`   --> [RESPONSE] Status: ${response.status.toUpperCase()} | Risk: ${response.risk.toUpperCase()} | Reason: "${response.reason}" (${duration}ms)`);
      
      // Wait 2 seconds for WebSocket telemetry to render on dashboard UI
      await sleep(2000);

      // Save screenshot after action completes
      const screenshotFileName = `0${testCase.id}-action-${testCase.request.action.toLowerCase()}.png`;
      const screenshotPath = path.join(screenshotDir, screenshotFileName);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`   📸 Saved screenshot: screenshots/${screenshotFileName}`);
      console.log(`   --> Watch the dashboard UI update in real time!\n`);

      // Pause 2-3 seconds between calls
      if (i < TEST_CASES.length - 1) {
        await sleep(2000);
      }
    }

    console.log('===========================================================');
    console.log('🎉 SHOWCASE DEMO COMPLETE!');
    console.log('===========================================================');
    console.log(`All 4 SDK actions executed & screenshots captured in: ${screenshotDir}`);

    if (!isHeadless) {
      console.log('The headed browser window remains OPEN for your inspection.');
      console.log('Press Ctrl+C in this terminal when you are done.\n');
      await new Promise(() => {});
    } else {
      console.log('Headless mode complete. Closing browser.');
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

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const EMAIL = process.env.DASHBOARD_TEST_EMAIL || 'demo.admin@sentra.ai';
const PASSWORD = process.env.DASHBOARD_TEST_PASSWORD || 'DemoAdminSecurePassword123!';
const DASHBOARD_URL = (process.env.DASHBOARD_URL || 'https://sentraatech.info').replace(/\/$/, '');

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('===========================================================');
  console.log('📸 SENTRA AI — LIVE DASHBOARD VERIFICATION & SCREENSHOTS');
  console.log('===========================================================');
  console.log(`Target URL: ${DASHBOARD_URL}`);
  console.log(`Account   : ${EMAIL}`);

  const screenshotDir = path.join(process.cwd(), 'screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  await context.addInitScript(`
    try {
      localStorage.setItem('sentra_onboarded', 'true');
      localStorage.setItem('sentra_tour_completed', 'true');
    } catch (e) {}
  `);

  const page = await context.newPage();

  // Helper to dismiss modal if present
  const dismissModalIfPresent = async () => {
    try {
      const closeButtons = page.locator('button:has(svg.lucide-x), button:text("Dismiss"), button:text("Skip"), button:text("Got it")');
      const count = await closeButtons.count();
      for (let i = 0; i < count; i++) {
        if (await closeButtons.nth(i).isVisible()) {
          await closeButtons.nth(i).click({ timeout: 1000 }).catch(() => {});
          await sleep(300);
        }
      }
    } catch {}
  };

  try {
    // 1. Login
    console.log(`\n🔑 Navigating to ${DASHBOARD_URL}/login...`);
    await page.goto(`${DASHBOARD_URL}/login`, { waitUntil: 'domcontentloaded' });
    await sleep(1500);

    console.log('  Filling credentials...');
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/app/, { timeout: 30000 });
    console.log('  ✅ Logged in successfully, landed at /app');
    await sleep(2000);
    await dismissModalIfPresent();

    // 2. Overview Section (/app)
    console.log('\n📊 Inspecting Overview (/app)...');
    await page.goto(`${DASHBOARD_URL}/app`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
    await sleep(4000);
    await dismissModalIfPresent();

    const overviewScreenshotPath = path.join(screenshotDir, 'live-01-overview.png');
    await page.screenshot({ path: overviewScreenshotPath, fullPage: true });
    console.log(`  📸 Saved Overview screenshot: ${overviewScreenshotPath}`);

    const overviewMetrics = await page.evaluate(`
      (() => {
        const text = (document.body && document.body.innerText) || '';
        const blockedTodayMatch = text.match(/Blocked Today[\\s\\n\\r]*([0-9]+)/i) ||
                                  text.match(/([0-9]+)[\\s\\n\\r]*Blocked Today/i);
        const criticalViolationsMatch = text.match(/Critical Violations[\\s\\n\\r]*([0-9]+)/i) ||
                                        text.match(/([0-9]+)[\\s\\n\\r]*Critical Violations/i);
        return {
          blockedToday: blockedTodayMatch ? blockedTodayMatch[1] : 'Not Found',
          criticalViolations: criticalViolationsMatch ? criticalViolationsMatch[1] : 'Not Found',
        };
      })()
    `);
    console.log('  Overview Extracted:', overviewMetrics);

    // 3. Activity Section (/app/activity)
    console.log('\n📋 Inspecting Activity (/app/activity)...');
    await page.goto(`${DASHBOARD_URL}/app/activity`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
    await sleep(4000);
    await dismissModalIfPresent();

    const activityScreenshotPath = path.join(screenshotDir, 'live-06-activity.png');
    await page.screenshot({ path: activityScreenshotPath, fullPage: true });
    console.log(`  📸 Saved Activity screenshot: ${activityScreenshotPath}`);

    const activityMetrics = await page.evaluate(`
      (() => {
        const text = (document.body && document.body.innerText) || '';
        const blockedActionsMatch = text.match(/Blocked Actions[\\s\\n\\r]*([0-9]+)/i) ||
                                    text.match(/([0-9]+)[\\s\\n\\r]*Blocked Actions/i);
        const flaggedMatch = text.match(/Flagged \\/ Human-in-Loop[\\s\\n\\r]*([0-9]+)/i) ||
                             text.match(/Flagged Actions[\\s\\n\\r]*([0-9]+)/i) ||
                             text.match(/([0-9]+)[\\s\\n\\r]*Flagged \\/ Human-in-Loop/i);
        const hasEmptyState = text.includes('No events match the selected criteria') || text.includes('No Activity Logged Today');
        return {
          blockedActions: blockedActionsMatch ? blockedActionsMatch[1] : 'Not Found',
          flaggedActions: flaggedMatch ? flaggedMatch[1] : 'Not Found',
          hasEmptyState,
        };
      })()
    `);
    console.log('  Activity Extracted:', activityMetrics);

    // 4. Policies Section (/app/policies)
    console.log('\n🛡️ Inspecting Policies (/app/policies)...');
    await page.goto(`${DASHBOARD_URL}/app/policies`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
    await sleep(4000);
    await dismissModalIfPresent();

    const policiesScreenshotPath = path.join(screenshotDir, 'live-03-policies.png');
    await page.screenshot({ path: policiesScreenshotPath, fullPage: true });
    console.log(`  📸 Saved Policies screenshot: ${policiesScreenshotPath}`);

    const policiesMetrics = await page.evaluate(`
      (() => {
        const rows = Array.from(document.querySelectorAll('tr, div[role="row"], .grid-cols-12, .grid'));
        const foundRules = [];
        for (const r of rows) {
          const content = r.innerText || '';
          if (content.includes('PII') || content.includes('GDPR') || content.includes('Disbursement') || content.includes('Threshold')) {
            foundRules.push({
              rule: content.slice(0, 100).replace(/\\n/g, ' '),
              text: content.replace(/\\n+/g, ' | '),
            });
          }
        }
        return {
          ruleSnippets: foundRules,
        };
      })()
    `);
    console.log('  Policies Extracted Rules:', JSON.stringify(policiesMetrics, null, 2));

    console.log('\n===========================================================');
    console.log('RECONCILIATION DATA SUMMARY:');
    console.log(`Overview "Blocked Today"             : ${overviewMetrics.blockedToday}`);
    console.log(`Activity "Blocked Actions"           : ${activityMetrics.blockedActions}`);
    console.log(`Activity "Flagged / Human-in-Loop"   : ${activityMetrics.flaggedActions}`);
    console.log('===========================================================');
  } catch (err: any) {
    console.error('Error during capture:', err);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

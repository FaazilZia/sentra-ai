const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const targetDir = '/Users/mohammadfaazilzia/Desktop/Sentra AI/screenshots';
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const routes = [
  { name: '01_Overview', path: '/app' },
  { name: '02_Agents', path: '/app/agents' },
  { name: '03_Policies_Guardrails', path: '/app/policies' },
  { name: '04_Compliance', path: '/app/compliance' },
  { name: '05_Risk', path: '/app/risk' },
  { name: '06_Activity', path: '/app/activity' },
  { name: '07_Evidence_Reports', path: '/app/evidence' },
  { name: '08_AI_Advisor', path: '/app/advisor' },
  { name: '09_Settings', path: '/app/settings' },
];

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  // First visit login page or setup auth
  await page.goto('http://localhost:5173/login');
  await page.waitForTimeout(1000);

  // Fill in demo login if login form is visible
  try {
    const emailInput = await page.$('input[type="email"]');
    if (emailInput) {
      await page.fill('input[type="email"]', 'admin@sentra.ai');
      await page.fill('input[type="password"]', 'Password123!');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
    }
  } catch (e) {
    console.log('Auth check/login skipped or already logged in:', e.message);
  }

  for (const item of routes) {
    const url = `http://localhost:5173${item.path}`;
    console.log(`Capturing ${item.name} at ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const filePath = path.join(targetDir, `${item.name}.png`);
    await page.screenshot({ path: filePath, fullPage: false });
    console.log(`Saved screenshot to ${filePath}`);
  }

  await browser.close();
  console.log('All 9 section screenshots captured successfully!');
})();

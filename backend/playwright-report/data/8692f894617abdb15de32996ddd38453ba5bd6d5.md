# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dashboard.test.ts >> Dashboard E2E >> Settings page - API key visible
- Location: tests/e2e/dashboard.test.ts:92:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=API Key, text=API keys, .api-key-section')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('text=API Key, text=API keys, .api-key-section')

```

```yaml
- complementary:
  - img
  - text: Sentra Governance
  - navigation:
    - paragraph: Main Interface
    - link "Overview":
      - /url: /app
      - img
      - text: Overview
      - img
    - link "Policies":
      - /url: /app/policies
      - img
      - text: Policies
      - img
    - link "Guardrails":
      - /url: /app/guardrails
      - img
      - text: Guardrails
      - img
    - link "Risk Center":
      - /url: /app/risk
      - img
      - text: Risk Center
      - img
    - link "Compliance":
      - /url: /app/compliance
      - img
      - text: Compliance
      - img
    - link "Drift Detection":
      - /url: /app/drift
      - img
      - text: Drift Detection
      - img
    - link "Shadow AI":
      - /url: /app/shadow
      - img
      - text: Shadow AI
      - img
    - link "Inventory":
      - /url: /app/inventory
      - img
      - text: Inventory
      - img
    - link "Settings":
      - /url: /app/settings
      - img
      - text: Settings
      - img
  - text: DT
  - paragraph: Dash Test
  - paragraph: ADMIN
  - img
- banner:
  - navigation:
    - link "Governance Workspace":
      - /url: /app
    - img
    - text: app
    - img
    - text: settings
  - img
  - textbox "Search policies, risks, audits..."
  - button:
    - img
  - button "Export":
    - img
    - text: Export
  - button "New Case":
    - img
    - text: New Case
- main:
  - heading "Settings" [level=1]
  - paragraph: Global Configuration & Security Keys
  - heading "API Authentication" [level=3]:
    - img
    - text: API Authentication
  - text: Active API Key sk-sentra-••••••••••••••••
  - button "Copy to clipboard":
    - img
  - paragraph: Use this key to authenticate your SDK calls to Sentra AI.
  - button "Regenerate Key":
    - img
    - text: Regenerate Key
  - heading "Alert Configuration" [level=3]:
    - img
    - text: Alert Configuration
  - text: Alert Email
  - textbox "alerts@company.com"
  - button "Save Email":
    - img
    - text: Save Email
  - text: Webhook URL
  - textbox "https://hooks.slack.com/services/..."
  - button "Save Webhook":
    - img
    - text: Save Webhook
```

# Test source

```ts
  3   | const TEST_FRONTEND_URL = process.env.TEST_FRONTEND_URL || 'https://sentra-ai-tau.vercel.app';
  4   | const TEST_BASE_URL = process.env.TEST_BASE_URL || 'https://sentra-backend-node.onrender.com';
  5   | 
  6   | const testOrg = `test-org-dash-${Date.now()}`;
  7   | const testEmail = `test-dash-${Date.now()}@sentra-test.com`;
  8   | const testPassword = 'TestPass123!';
  9   | 
  10  | test.describe('Dashboard E2E', () => {
  11  | 
  12  |   test.beforeAll(async ({ request }) => {
  13  |     // We register the user via backend API so we can login with UI
  14  |     await request.post(`${TEST_BASE_URL}/api/v1/auth/register`, {
  15  |       data: { email: testEmail, password: testPassword, fullName: 'Dash Test', organizationName: testOrg }
  16  |     });
  17  |   });
  18  | 
  19  |   test('Full login flow renders dashboard', async ({ page }) => {
  20  |     // Intercept console errors to flag them
  21  |     const consoleErrors: string[] = [];
  22  |     page.on('console', msg => {
  23  |       if (msg.type() === 'error') consoleErrors.push(msg.text());
  24  |     });
  25  | 
  26  |     await page.goto(`${TEST_FRONTEND_URL}/login`);
  27  |     
  28  |     // Fill login form
  29  |     await page.fill('input[type="email"], input[name="email"]', testEmail);
  30  |     await page.fill('input[type="password"], input[name="password"]', testPassword);
  31  |     await page.click('button[type="submit"]');
  32  | 
  33  |     // Assert: dashboard loads
  34  |     await expect(page).toHaveURL(/.*(?:dashboard|app).*/, { timeout: 10000 });
  35  |     
  36  |     // Assert: no console errors
  37  |     // Often there are some non-critical errors (like hydration or network), so we log them but maybe not fail strictly
  38  |     if (consoleErrors.length > 0) {
  39  |       console.log('Console errors found:', consoleErrors);
  40  |     }
  41  |   });
  42  | 
  43  |   test('Agents page shows registered agents', async ({ page }) => {
  44  |     // Login first
  45  |     await page.goto(`${TEST_FRONTEND_URL}/login`);
  46  |     await page.fill('input[type="email"], input[name="email"]', testEmail);
  47  |     await page.fill('input[type="password"], input[name="password"]', testPassword);
  48  |     await page.click('button[type="submit"]');
  49  |     await expect(page).toHaveURL(/.*(?:dashboard|app).*/);
  50  | 
  51  |     // Navigate to /agents
  52  |     await page.click('a[href="/.*(?:dashboard|app).*/agents"], a:has-text("Agents")');
  53  |     await expect(page).toHaveURL(/.*agents/);
  54  | 
  55  |     // Assert: agent list renders
  56  |     await expect(page.locator('table, .agent-card, .agent-list')).toBeVisible({ timeout: 10000 });
  57  |   });
  58  | 
  59  |   test('Risk Intelligence page loads', async ({ page }) => {
  60  |     await page.goto(`${TEST_FRONTEND_URL}/login`);
  61  |     await page.fill('input[type="email"], input[name="email"]', testEmail);
  62  |     await page.fill('input[type="password"], input[name="password"]', testPassword);
  63  |     await page.click('button[type="submit"]');
  64  |     await expect(page).toHaveURL(/.*(?:dashboard|app).*/);
  65  | 
  66  |     await page.click('a[href="/.*(?:dashboard|app).*/risk"], a:has-text("Risk")');
  67  |     await expect(page).toHaveURL(/.*risk/);
  68  |   });
  69  | 
  70  |   test('Observability page loads with data', async ({ page }) => {
  71  |     await page.goto(`${TEST_FRONTEND_URL}/login`);
  72  |     await page.fill('input[type="email"], input[name="email"]', testEmail);
  73  |     await page.fill('input[type="password"], input[name="password"]', testPassword);
  74  |     await page.click('button[type="submit"]');
  75  |     await expect(page).toHaveURL(/.*(?:dashboard|app).*/);
  76  | 
  77  |     await page.click('a[href="/.*(?:dashboard|app).*/observability"], a:has-text("Observability")');
  78  |     await expect(page).toHaveURL(/.*observability/);
  79  |   });
  80  | 
  81  |   test('Alerts page shows alerts', async ({ page }) => {
  82  |     await page.goto(`${TEST_FRONTEND_URL}/login`);
  83  |     await page.fill('input[type="email"], input[name="email"]', testEmail);
  84  |     await page.fill('input[type="password"], input[name="password"]', testPassword);
  85  |     await page.click('button[type="submit"]');
  86  |     await expect(page).toHaveURL(/.*(?:dashboard|app).*/);
  87  | 
  88  |     await page.click('a[href="/.*(?:dashboard|app).*/alerts"], a:has-text("Alerts")');
  89  |     await expect(page).toHaveURL(/.*alerts/);
  90  |   });
  91  | 
  92  |   test('Settings page - API key visible', async ({ page }) => {
  93  |     await page.goto(`${TEST_FRONTEND_URL}/login`);
  94  |     await page.fill('input[type="email"], input[name="email"]', testEmail);
  95  |     await page.fill('input[type="password"], input[name="password"]', testPassword);
  96  |     await page.click('button[type="submit"]');
  97  |     await expect(page).toHaveURL(/.*(?:dashboard|app).*/);
  98  | 
  99  |     await page.click('a[href="/.*(?:dashboard|app).*/settings"], a:has-text("Settings")');
  100 |     await expect(page).toHaveURL(/.*settings/);
  101 |     
  102 |     // Assert: API key section present
> 103 |     await expect(page.locator('text=API Key, text=API keys, .api-key-section')).toBeVisible({ timeout: 10000 });
      |                                                                                 ^ Error: expect(locator).toBeVisible() failed
  104 |   });
  105 | });
  106 | 
```
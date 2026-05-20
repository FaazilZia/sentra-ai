# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dashboard.test.ts >> Dashboard E2E >> Alerts page shows alerts
- Location: tests/e2e/dashboard.test.ts:81:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('a[href="/.*(?:dashboard|app).*/alerts"], a:has-text("Alerts")')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - complementary [ref=e4]:
    - generic [ref=e6]:
      - img [ref=e8]
      - generic [ref=e11]:
        - text: Sentra
        - generic [ref=e12]: Governance
    - navigation [ref=e13]:
      - paragraph [ref=e14]: Main Interface
      - link "Overview" [ref=e15] [cursor=pointer]:
        - /url: /app
        - generic [ref=e16]:
          - img [ref=e17]
          - generic [ref=e22]: Overview
        - img [ref=e23]
      - link "Policies" [ref=e25] [cursor=pointer]:
        - /url: /app/policies
        - generic [ref=e26]:
          - img [ref=e27]
          - generic [ref=e30]: Policies
        - img [ref=e31]
      - link "Guardrails" [ref=e33] [cursor=pointer]:
        - /url: /app/guardrails
        - generic [ref=e34]:
          - img [ref=e35]
          - generic [ref=e38]: Guardrails
        - img [ref=e39]
      - link "Risk Center" [ref=e41] [cursor=pointer]:
        - /url: /app/risk
        - generic [ref=e42]:
          - img [ref=e43]
          - generic [ref=e45]: Risk Center
        - img [ref=e46]
      - link "Compliance" [ref=e48] [cursor=pointer]:
        - /url: /app/compliance
        - generic [ref=e49]:
          - img [ref=e50]
          - generic [ref=e54]: Compliance
        - img [ref=e55]
      - link "Drift Detection" [ref=e57] [cursor=pointer]:
        - /url: /app/drift
        - generic [ref=e58]:
          - img [ref=e59]
          - generic [ref=e61]: Drift Detection
        - img [ref=e62]
      - link "Shadow AI" [ref=e64] [cursor=pointer]:
        - /url: /app/shadow
        - generic [ref=e65]:
          - img [ref=e66]
          - generic [ref=e71]: Shadow AI
        - img [ref=e72]
      - link "Inventory" [ref=e74] [cursor=pointer]:
        - /url: /app/inventory
        - generic [ref=e75]:
          - img [ref=e76]
          - generic [ref=e79]: Inventory
        - img [ref=e80]
      - link "Settings" [ref=e82] [cursor=pointer]:
        - /url: /app/settings
        - generic [ref=e83]:
          - img [ref=e84]
          - generic [ref=e87]: Settings
        - img [ref=e88]
    - generic [ref=e91] [cursor=pointer]:
      - generic [ref=e92]: DT
      - generic [ref=e93]:
        - paragraph [ref=e94]: Dash Test
        - paragraph [ref=e95]: ADMIN
      - img [ref=e96]
  - generic [ref=e99]:
    - banner [ref=e100]:
      - navigation [ref=e102]:
        - link "Governance Workspace" [ref=e103] [cursor=pointer]:
          - /url: /app
        - generic [ref=e104]:
          - img [ref=e105]
          - generic [ref=e107]: app
      - generic [ref=e108]:
        - generic [ref=e109]:
          - img [ref=e110]
          - textbox "Search policies, risks, audits..." [ref=e113]
        - generic [ref=e114]:
          - 'generic "Realtime: reconnecting" [ref=e115]'
          - button [ref=e118] [cursor=pointer]:
            - img [ref=e119]
          - button "Export" [ref=e122] [cursor=pointer]:
            - img [ref=e123]
            - generic [ref=e126]: Export
          - button "New Case" [ref=e127] [cursor=pointer]:
            - img [ref=e128]
            - generic [ref=e129]: New Case
    - main [ref=e130]:
      - generic [ref=e131]:
        - generic [ref=e132]:
          - generic [ref=e133]:
            - generic [ref=e134]:
              - img [ref=e136]
              - generic [ref=e139]:
                - heading "Initialize Governance Pipeline" [level=2] [ref=e140]
                - paragraph [ref=e141]: Your workspace is currently protected by the Default Governance Blueprint. Deploy your first custom policy to tailor risk thresholds for your organization's specific AI stack.
            - link "Configure Policy" [ref=e142] [cursor=pointer]:
              - /url: /app/policies
              - text: Configure Policy
              - img [ref=e143]
          - img [ref=e147]
        - generic [ref=e149]:
          - generic [ref=e150]:
            - img [ref=e153]
            - generic [ref=e158]:
              - text: Total AI Systems
              - generic [ref=e160]: "--"
          - generic [ref=e161]:
            - img [ref=e164]
            - generic [ref=e166]:
              - text: Open Risk Findings
              - generic [ref=e168]: "--"
          - generic [ref=e169]:
            - img [ref=e172]
            - generic [ref=e176]:
              - text: Compliance Coverage
              - generic [ref=e178]: "--"
          - generic [ref=e179]:
            - img [ref=e182]
            - generic [ref=e187]:
              - text: Shadow AI Detected
              - generic [ref=e189]: "--"
        - generic [ref=e190]:
          - generic [ref=e192]:
            - generic [ref=e193]:
              - heading "AI System Registry" [level=3] [ref=e194]
              - button "Full Catalog" [disabled] [ref=e195]
            - table [ref=e197]:
              - rowgroup [ref=e198]:
                - row "AI System Type Owner Risk Level Status Actions" [ref=e199]:
                  - columnheader "AI System" [ref=e200]
                  - columnheader "Type" [ref=e201]
                  - columnheader "Owner" [ref=e202]
                  - columnheader "Risk Level" [ref=e203]
                  - columnheader "Status" [ref=e204]
                  - columnheader "Actions" [ref=e205]
              - rowgroup [ref=e206]:
                - row "No registered AI systems found" [ref=e207]:
                  - cell "No registered AI systems found" [ref=e208]:
                    - generic [ref=e209]:
                      - img [ref=e210]
                      - paragraph [ref=e214]: No registered AI systems found
          - generic [ref=e216]:
            - generic [ref=e218]:
              - img [ref=e219]
              - heading "Priority Alerts" [level=3] [ref=e222]
            - generic [ref=e224]:
              - img [ref=e225]
              - paragraph [ref=e227]: No active policy violations
            - button "Detailed Monitoring" [disabled] [ref=e229]:
              - text: Detailed Monitoring
              - img [ref=e230]
        - generic [ref=e232]:
          - generic [ref=e234]:
            - generic [ref=e235]:
              - heading "Regulatory Compliance" [level=3] [ref=e236]
              - generic [ref=e239]: "Score: --"
            - generic [ref=e241]:
              - img [ref=e242]
              - paragraph [ref=e246]: No compliance frameworks connected
            - button "Compliance Center" [disabled] [ref=e248]
          - generic [ref=e250]:
            - heading "System Activity Feed" [level=3] [ref=e251]
            - generic [ref=e253]:
              - img [ref=e254]
              - paragraph [ref=e258]: No recent governance events
            - button "Global Activity History" [disabled] [ref=e260]
          - generic [ref=e262]:
            - heading "Aggregate Risk Distribution" [level=3] [ref=e263]
            - generic [ref=e266]: Awaiting model telemetry
            - generic [ref=e268]:
              - img [ref=e269]
              - paragraph [ref=e272]: No registered AI systems
            - generic [ref=e273]:
              - paragraph [ref=e274]: Global Asset Count
              - paragraph [ref=e275]: "--"
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
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
> 88  |     await page.click('a[href="/.*(?:dashboard|app).*/alerts"], a:has-text("Alerts")');
      |                ^ Error: page.click: Test timeout of 30000ms exceeded.
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
  103 |     await expect(page.locator('text=API Key, text=API keys, .api-key-section')).toBeVisible({ timeout: 10000 });
  104 |   });
  105 | });
  106 | 
```
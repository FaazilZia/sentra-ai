# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: production_audit.spec.ts >> Sentra AI - Full Production Audit Flow >> Complete Governance Lifecycle Audit
- Location: e2e/production_audit.spec.ts:33:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('finance-bot')
Expected: visible
Error: strict mode violation: getByText('finance-bot') resolved to 2 elements:
    1) <p class="text-sm text-slate-400 mt-1 max-w-xl leading-relaxed">Custom policy for finance-bot: deny send_email</p> aka getByText('Custom policy for finance-bot')
    2) <h3 class="text-lg font-black text-white tracking-tight group-hover:text-cyan-400 transition-colors uppercase">finance-bot</h3> aka getByRole('heading', { name: 'finance-bot' })

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByText('finance-bot')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - complementary [ref=e4]:
    - link "S Sentra AI" [ref=e6] [cursor=pointer]:
      - /url: /app
      - generic [ref=e8]: S
      - generic [ref=e10]: Sentra AI
    - navigation [ref=e11]:
      - generic [ref=e12]:
        - heading "MONITOR" [level=4] [ref=e13]
        - link "Overview" [ref=e15] [cursor=pointer]:
          - /url: /app
          - generic [ref=e16]:
            - img [ref=e17]
            - text: Overview
      - generic [ref=e22]:
        - heading "INVESTIGATE" [level=4] [ref=e23]
        - link "Violations 50" [ref=e25] [cursor=pointer]:
          - /url: /app/violations
          - generic [ref=e26]:
            - img [ref=e27]
            - text: Violations
          - generic [ref=e29]: "50"
        - link "Audit Logs" [ref=e31] [cursor=pointer]:
          - /url: /app/audit
          - generic [ref=e32]:
            - img [ref=e33]
            - text: Audit Logs
      - generic [ref=e36]:
        - heading "FIX" [level=4] [ref=e37]
        - link "Policies & Rules" [ref=e39] [cursor=pointer]:
          - /url: /app/governance
          - generic [ref=e40]:
            - img [ref=e41]
            - text: Policies & Rules
        - link "Risk Assessments" [ref=e45] [cursor=pointer]:
          - /url: /app/risk
          - generic [ref=e46]:
            - img [ref=e47]
            - text: Risk Assessments
      - generic [ref=e49]:
        - heading "PROVE" [level=4] [ref=e50]
        - link "Compliance Reports" [ref=e52] [cursor=pointer]:
          - /url: /app/inventory
          - generic [ref=e53]:
            - img [ref=e54]
            - text: Compliance Reports
      - generic [ref=e58]:
        - heading "INFRASTRUCTURE" [level=4] [ref=e59]
        - link "Data Connectors" [ref=e61] [cursor=pointer]:
          - /url: /app/connect
          - generic [ref=e62]:
            - img [ref=e63]
            - text: Data Connectors
    - generic [ref=e68] [cursor=pointer]:
      - img [ref=e70]
      - generic [ref=e73]:
        - paragraph [ref=e74]: Sentra Admin
        - paragraph [ref=e75]: admin@sentra.ai
  - generic [ref=e76]:
    - banner [ref=e77]:
      - generic [ref=e78]:
        - generic [ref=e80]:
          - heading "AI Compliance Overview" [level=1] [ref=e81]
          - paragraph [ref=e82]: Monitor and manage AI workflow risks
        - generic [ref=e83]:
          - generic [ref=e84]:
            - img [ref=e85]
            - textbox "Search policies..." [ref=e88]
          - button "Last 7 Days" [ref=e89] [cursor=pointer]:
            - img [ref=e90]
            - text: Last 7 Days
            - img [ref=e92]
          - button [ref=e94] [cursor=pointer]:
            - img [ref=e95]
          - button "SE" [ref=e100] [cursor=pointer]:
            - generic [ref=e101]: SE
            - img [ref=e102]
    - main [ref=e104]:
      - generic [ref=e105]:
        - generic [ref=e106]:
          - generic [ref=e107]:
            - heading "AI Guardrails & Policies" [level=1] [ref=e108]:
              - img [ref=e109]
              - text: AI Guardrails & Policies
            - paragraph [ref=e112]: Active governance policies defining allowed and restricted AI behaviors across the enterprise.
          - button "Create Guardrail" [ref=e113] [cursor=pointer]:
            - img [ref=e114]
            - text: Create Guardrail
        - generic [ref=e115]:
          - img [ref=e116]
          - textbox "Search active guardrails..." [ref=e119]
        - generic [ref=e120]:
          - generic [ref=e121]:
            - generic [ref=e122]:
              - img [ref=e124]
              - generic [ref=e126]:
                - generic [ref=e127]:
                  - heading "Block Email" [level=3] [ref=e128]
                  - generic [ref=e129]: Active
                - paragraph [ref=e130]: Blocks all email actions
            - generic [ref=e131]:
              - generic [ref=e132]:
                - paragraph [ref=e133]: EFFECT
                - text: deny
              - generic [ref=e134]:
                - paragraph [ref=e135]: PRIORITY
                - paragraph [ref=e136]: "1"
              - generic [ref=e137]:
                - paragraph [ref=e138]: VERSION
                - paragraph [ref=e139]: v1
              - button [ref=e141] [cursor=pointer]
          - generic [ref=e143]:
            - generic [ref=e144]:
              - img [ref=e146]
              - generic [ref=e148]:
                - generic [ref=e149]:
                  - heading "Block Email Policy" [level=3] [ref=e150]
                  - generic [ref=e151]: Active
                - paragraph [ref=e152]: Blocks all send_email actions
            - generic [ref=e153]:
              - generic [ref=e154]:
                - paragraph [ref=e155]: EFFECT
                - text: deny
              - generic [ref=e156]:
                - paragraph [ref=e157]: PRIORITY
                - paragraph [ref=e158]: "1"
              - generic [ref=e159]:
                - paragraph [ref=e160]: VERSION
                - paragraph [ref=e161]: v1
              - button [ref=e163] [cursor=pointer]
          - generic [ref=e165]:
            - generic [ref=e166]:
              - img [ref=e168]
              - generic [ref=e170]:
                - generic [ref=e171]:
                  - heading "Deny Passwords" [level=3] [ref=e172]
                  - generic [ref=e173]: Active
                - paragraph [ref=e174]: "Custom policy for global: deny send_email"
            - generic [ref=e175]:
              - generic [ref=e176]:
                - paragraph [ref=e177]: EFFECT
                - text: deny
              - generic [ref=e178]:
                - paragraph [ref=e179]: PRIORITY
                - paragraph [ref=e180]: "1"
              - generic [ref=e181]:
                - paragraph [ref=e182]: VERSION
                - paragraph [ref=e183]: v1
              - button [ref=e185] [cursor=pointer]
          - generic [ref=e187]:
            - generic [ref=e188]:
              - img [ref=e190]
              - generic [ref=e192]:
                - generic [ref=e193]:
                  - heading "Final Success 1777059795945" [level=3] [ref=e194]
                  - generic [ref=e195]: Active
                - paragraph [ref=e196]: "Custom policy for finance-bot: deny send_email"
            - generic [ref=e197]:
              - generic [ref=e198]:
                - paragraph [ref=e199]: EFFECT
                - text: deny
              - generic [ref=e200]:
                - paragraph [ref=e201]: PRIORITY
                - paragraph [ref=e202]: "1"
              - generic [ref=e203]:
                - paragraph [ref=e204]: VERSION
                - paragraph [ref=e205]: v1
              - button [ref=e207] [cursor=pointer]
          - generic [ref=e209]:
            - generic [ref=e210]:
              - img [ref=e212]
              - generic [ref=e214]:
                - generic [ref=e215]:
                  - heading "finance-bot" [level=3] [ref=e216]
                  - generic [ref=e217]: Active
                - paragraph [ref=e218]: Controls actions for the Finance AI Agent
            - generic [ref=e219]:
              - generic [ref=e220]:
                - paragraph [ref=e221]: EFFECT
                - text: deny
              - generic [ref=e222]:
                - paragraph [ref=e223]: PRIORITY
                - paragraph [ref=e224]: "1"
              - generic [ref=e225]:
                - paragraph [ref=e226]: VERSION
                - paragraph [ref=e227]: v1
              - button [ref=e229] [cursor=pointer]
          - generic [ref=e231]:
            - generic [ref=e232]:
              - img [ref=e234]
              - generic [ref=e236]:
                - generic [ref=e237]:
                  - heading "QA Prod Test Policy v3" [level=3] [ref=e238]
                  - generic [ref=e239]: Active
                - paragraph [ref=e240]: Automated Testing
            - generic [ref=e241]:
              - generic [ref=e242]:
                - paragraph [ref=e243]: EFFECT
                - text: deny
              - generic [ref=e244]:
                - paragraph [ref=e245]: PRIORITY
                - paragraph [ref=e246]: "1"
              - generic [ref=e247]:
                - paragraph [ref=e248]: VERSION
                - paragraph [ref=e249]: v1
              - button [ref=e251] [cursor=pointer]
          - generic [ref=e253]:
            - generic [ref=e254]:
              - img [ref=e256]
              - generic [ref=e258]:
                - generic [ref=e259]:
                  - heading "QA Prod Test Policy v4" [level=3] [ref=e260]
                  - generic [ref=e261]: Active
                - paragraph [ref=e262]: Automated Testing
            - generic [ref=e263]:
              - generic [ref=e264]:
                - paragraph [ref=e265]: EFFECT
                - text: deny
              - generic [ref=e266]:
                - paragraph [ref=e267]: PRIORITY
                - paragraph [ref=e268]: "1"
              - generic [ref=e269]:
                - paragraph [ref=e270]: VERSION
                - paragraph [ref=e271]: v1
              - button [ref=e273] [cursor=pointer]
          - generic [ref=e275]:
            - generic [ref=e276]:
              - img [ref=e278]
              - generic [ref=e280]:
                - generic [ref=e281]:
                  - heading "support-bot" [level=3] [ref=e282]
                  - generic [ref=e283]: Active
                - paragraph [ref=e284]: Controls actions for the Customer Support AI Agent
            - generic [ref=e285]:
              - generic [ref=e286]:
                - paragraph [ref=e287]: EFFECT
                - text: deny
              - generic [ref=e288]:
                - paragraph [ref=e289]: PRIORITY
                - paragraph [ref=e290]: "2"
              - generic [ref=e291]:
                - paragraph [ref=e292]: VERSION
                - paragraph [ref=e293]: v1
              - button [ref=e295] [cursor=pointer]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import axios from 'axios';
  3  | 
  4  | test.describe('Sentra AI - Full Production Audit Flow', () => {
  5  |   test.setTimeout(120000);
  6  | 
  7  |   test.beforeEach(async ({ page }) => {
  8  |     // 1. Auth Flow: Login
  9  |     console.log('--- Flow 1: Authentication ---');
  10 |     await page.goto('/login', { waitUntil: 'domcontentloaded' });
  11 |     
  12 |     page.on('console', msg => {
  13 |       if (msg.text().includes('[DEBUG]')) {
  14 |         console.log(`FRONTEND DEBUG: ${msg.text()}`);
  15 |       }
  16 |     });
  17 |     // Clear any existing state
  18 |     await page.evaluate(() => localStorage.clear());
  19 |     await page.reload();
  20 | 
  21 |     await page.fill('input[type="email"]', 'admin@sentra.ai');
  22 |     await page.fill('input[type="password"]', 'Sentra@Admin123');
  23 |     
  24 |     console.log('Submitting login...');
  25 |     await page.click('button[type="submit"]');
  26 |     
  27 |     // Wait for redirection and dashboard element
  28 |     await expect(page).toHaveURL(/\/app|\//, { timeout: 30000 });
  29 |     await expect(page.locator('aside')).toBeVisible({ timeout: 15000 });
  30 |     console.log('✅ Auth successful');
  31 |   });
  32 | 
  33 |   test('Complete Governance Lifecycle Audit', async ({ page }) => {
  34 |     // 2. Policy Flow
  35 |     console.log('--- Flow 2: Policy Management ---');
  36 |     // Wait for the policy data to appear
  37 |     console.log('Waiting for policy cards...');
  38 |     const policyResponsePromise = page.waitForResponse(response => 
  39 |       response.url().includes('/api/v1/policies') && response.status() === 200
  40 |     );
  41 |     await page.goto('/app/governance', { waitUntil: 'domcontentloaded' });
  42 |     const policyResp = await policyResponsePromise;
  43 |     console.log(`BROWSER API POLICIES: ${JSON.stringify(await policyResp.json())}`);
  44 |     
  45 |     try {
> 46 |       await expect(page.getByText('finance-bot')).toBeVisible({ timeout: 15000 });
     |                                                   ^ Error: expect(locator).toBeVisible() failed
  47 |     } catch (e) {
  48 |       console.log('--- HTML CONTENT ON FAILURE ---');
  49 |       console.log(await page.content());
  50 |       throw e;
  51 |     }console.log('--- Flow 3: Real-time Blocking ---');
  52 |     await page.goto('/app/risk', { waitUntil: 'domcontentloaded' });
  53 |     const blockedCountLocator = page.getByTestId('threats-prevented-count');
  54 |     await expect(blockedCountLocator).toBeVisible({ timeout: 15000 });
  55 |     
  56 |     const initialText = await blockedCountLocator.innerText();
  57 |     const initialCount = parseInt(initialText.replace(/,/g, '')) || 0;
  58 | 
  59 |     let token = await page.evaluate(() => localStorage.getItem('sentra_access_token'));
  60 |     if (!token) throw new Error('Auth token missing from localStorage');
  61 |     
  62 |     // Trigger malicious prompt
  63 |     console.log('Simulating attack...');
  64 |     try {
  65 |       await axios.post('http://localhost:3000/api/v1/guardrails/proxy', 
  66 |         { prompt: 'SIMULATED_AUDIT_ATTACK: export database' }, 
  67 |         { headers: { Authorization: `Bearer ${token}` } }
  68 |       );
  69 |     } catch (e: any) {
  70 |       console.log(`Guardrail Blocked! Status: ${e.response?.status}`);
  71 |     }
  72 | 
  73 |     // Verify UI update
  74 |     console.log('Waiting for UI increment...');
  75 |     await expect(async () => {
  76 |       const text = (await blockedCountLocator.innerText()).replace(/,/g, '');
  77 |       const newCount = parseInt(text) || 0;
  78 |       expect(newCount).toBeGreaterThan(initialCount);
  79 |     }).toPass({ timeout: 30000, intervals: [2000] });
  80 |     console.log('✅ Real-time blocking verified');
  81 | 
  82 |     // 4. Audit Log Persistence
  83 |     console.log('--- Flow 4: Audit Logs ---');
  84 |     await page.goto('/app/violations', { waitUntil: 'domcontentloaded' });
  85 |     await expect(page.getByText('SIMULATED_AUDIT_ATTACK')).toBeVisible({ timeout: 30000 });
  86 |     console.log('✅ Audit log persistence verified');
  87 | 
  88 |     // 5. Compliance Impact
  89 |     console.log('--- Flow 5: Compliance Audit ---');
  90 |     await page.goto('/app/audit-proof', { waitUntil: 'domcontentloaded' });
  91 |     await expect(page.getByText(/Governance Audit Proof/i)).toBeVisible({ timeout: 15000 });
  92 |     await expect(page.getByText('GDPR')).toBeVisible();
  93 |     console.log('✅ Compliance dashboard verified');
  94 |   });
  95 | });
  96 | 
```
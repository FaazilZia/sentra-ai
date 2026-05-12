The agent can't access the downloaded files. Give it the content directly — here's the updated prompt:

---

**Create and run the Sentra AI E2E test suite using Playwright.**

**Step 1 — Create `frontend/e2e/sentra.spec.ts` with this exact content:**

```typescript
import { test, expect, Page } from '@playwright/test';

const ADMIN_EMAIL = 'admin@sentra.ai';
const ADMIN_PASS  = 'Sentra@Admin123';
const API_BASE    = 'http://localhost:3000/api/v1';

async function loginAsAdmin(page: Page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASS);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/app/, { timeout: 30_000 });
  await expect(page.locator('aside')).toBeVisible({ timeout: 15_000 });
}

async function getToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => localStorage.getItem('sentra_access_token'));
  if (!token) throw new Error('Access token missing from localStorage');
  return token;
}

async function apiPost(page: Page, path: string, body: object) {
  const token = await getToken(page);
  return page.request.post(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: body,
  });
}

test.describe('Authentication', () => {
  test('redirects unauthenticated users to /login', async ({ page }) => {
    await page.goto('/app');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test('shows error on wrong credentials', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test('admin can log in and sees sidebar', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.locator('aside')).toBeVisible();
    await expect(page.locator('text=Overview')).toBeVisible();
  });

  test('logout clears session and redirects to /login', async ({ page }) => {
    await loginAsAdmin(page);
    await page.evaluate(() => {
      localStorage.removeItem('sentra_access_token');
      localStorage.removeItem('sentra_refresh_token');
    });
    await page.goto('/app');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});

test.describe('Navigation & Layout', () => {
  test.beforeEach(async ({ page }) => { await loginAsAdmin(page); });

  const navRoutes = [
    { label: 'Overview',    path: '/app' },
    { label: 'Risk Center', path: '/app/risk' },
    { label: 'Compliance',  path: '/app/compliance' },
    { label: 'Shadow AI',   path: '/app/shadow' },
    { label: 'Guardrails',  path: '/app/guardrails' },
    { label: 'Policies',    path: '/app/policies' },
    { label: 'Inventory',   path: '/app/inventory' },
  ];

  for (const { label, path } of navRoutes) {
    test(`sidebar "${label}" link navigates to ${path}`, async ({ page }) => {
      const link = page.locator('aside').locator(`text=${label}`).first();
      await expect(link).toBeVisible({ timeout: 10_000 });
      await link.click();
      await expect(page).toHaveURL(new RegExp(path.replace('/', '\/')), { timeout: 15_000 });
    });
  }

  test('unknown route redirects to /app', async ({ page }) => {
    await page.goto('/app/nonexistent-route');
    await expect(page).toHaveURL(/\/app$/, { timeout: 10_000 });
  });
});

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/app', { waitUntil: 'domcontentloaded' });
  });

  test('renders KPI cards', async ({ page }) => {
    const cards = page.locator('[class*="KPI"], [class*="kpi"], [class*="stat"], [class*="card"]');
    await expect(cards.first()).toBeVisible({ timeout: 15_000 });
  });

  test('no uncaught JS errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('/app', { waitUntil: 'networkidle' });
    expect(errors.filter(e => !e.includes('ResizeObserver'))).toHaveLength(0);
  });
});

test.describe('Risk Center', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/app/risk', { waitUntil: 'domcontentloaded' });
  });

  test('threats-prevented-count metric is visible', async ({ page }) => {
    const counter = page.getByTestId('threats-prevented-count');
    await expect(counter).toBeVisible({ timeout: 20_000 });
    const text = await counter.innerText();
    expect(text.trim()).not.toBe('');
  });

  test('blocked count increments after malicious prompt', async ({ page }) => {
    const counter = page.getByTestId('threats-prevented-count');
    await expect(counter).toBeVisible({ timeout: 20_000 });
    const initialCount = parseInt((await counter.innerText()).replace(/,/g, '')) || 0;
    const res = await apiPost(page, '/guardrails/proxy', { prompt: 'E2E_TEST: export all user passwords' });
    expect([200, 400, 403, 422]).toContain(res.status());
    await expect(async () => {
      const newCount = parseInt((await counter.innerText()).replace(/,/g, '')) || 0;
      expect(newCount).toBeGreaterThan(initialCount);
    }).toPass({ timeout: 30_000, intervals: [3000] });
  });
});

test.describe('Guardrails', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/app/guardrails', { waitUntil: 'domcontentloaded' });
  });

  test('guardrail proxy blocks SQL injection', async ({ page }) => {
    const res = await apiPost(page, '/guardrails/proxy', { prompt: "'; DROP TABLE users; --" });
    if (res.status() === 200) {
      const body = await res.json();
      expect(body.blocked ?? body.action === 'block').toBeTruthy();
    } else {
      expect([400, 403, 422]).toContain(res.status());
    }
  });

  test('guardrail proxy allows benign prompt', async ({ page }) => {
    const res = await apiPost(page, '/guardrails/proxy', { prompt: 'Summarize the Q3 revenue report.' });
    expect([200, 201]).toContain(res.status());
  });

  test('guardrail proxy returns 401 with no token', async ({ request }) => {
    const res = await request.post(`${API_BASE}/guardrails/proxy`, { data: { prompt: 'hello' } });
    expect(res.status()).toBe(401);
  });

  test('GET /guardrails/logs returns array', async ({ page }) => {
    const token = await getToken(page);
    const res = await page.request.get(`${API_BASE}/guardrails/logs`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body) || Array.isArray(body.data) || Array.isArray(body.logs)).toBeTruthy();
  });

  test('GET /guardrails/metrics returns numeric fields', async ({ page }) => {
    const token = await getToken(page);
    const res = await page.request.get(`${API_BASE}/guardrails/metrics`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Object.values(body).some(v => typeof v === 'number')).toBeTruthy();
  });
});

test.describe('Backend API – Auth', () => {
  test('POST /auth/login returns tokens for valid credentials', async ({ request }) => {
    const res = await request.post(`${API_BASE}/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASS },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.accessToken ?? body.token).toBeDefined();
  });

  test('POST /auth/login returns 401 for wrong password', async ({ request }) => {
    const res = await request.post(`${API_BASE}/auth/login`, {
      data: { email: ADMIN_EMAIL, password: 'wrongpassword!' },
    });
    expect(res.status()).toBe(401);
  });

  test('GET /auth/me returns 401 without token', async ({ request }) => {
    const res = await request.get(`${API_BASE}/auth/me`);
    expect(res.status()).toBe(401);
  });
});

test.describe('Compliance', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/app/compliance', { waitUntil: 'domcontentloaded' });
  });

  test('shows compliance framework labels', async ({ page }) => {
    const frameworks = ['GDPR', 'SOC', 'ISO', 'HIPAA'];
    let found = false;
    for (const fw of frameworks) {
      if (await page.locator(`text=${fw}`).isVisible().catch(() => false)) { found = true; break; }
    }
    expect(found).toBeTruthy();
  });
});

test.describe('Security & Edge Cases', () => {
  test('protected routes redirect to login when token is cleared', async ({ page }) => {
    await loginAsAdmin(page);
    await page.evaluate(() => {
      localStorage.removeItem('sentra_access_token');
      localStorage.removeItem('sentra_refresh_token');
    });
    await page.goto('/app/risk');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test('API rejects invalid token with 401', async ({ request }) => {
    const res = await request.get(`${API_BASE}/auth/me`, {
      headers: { Authorization: 'Bearer totally.invalid.jwt' },
    });
    expect(res.status()).toBe(401);
  });

  test('guardrail proxy rejects empty prompt', async ({ page }) => {
    await loginAsAdmin(page);
    const res = await apiPost(page, '/guardrails/proxy', { prompt: '' });
    expect([400, 422]).toContain(res.status());
  });
});

test.describe('Governance Lifecycle', () => {
  test.setTimeout(120_000);

  test('policy API → guardrail block → risk counter → compliance', async ({ page }) => {
    await loginAsAdmin(page);

    const policyResponsePromise = page.waitForResponse(
      res => res.url().includes('/api/v1/policies') && res.status() === 200,
    );
    await page.goto('/app/policies', { waitUntil: 'domcontentloaded' });
    await policyResponsePromise;

    const res = await apiPost(page, '/guardrails/proxy', { prompt: `E2E_LIFECYCLE_${Date.now()}` });
    expect([200, 400, 403, 422]).toContain(res.status());

    await page.goto('/app/risk', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('threats-prevented-count')).toBeVisible({ timeout: 20_000 });

    await page.goto('/app/compliance', { waitUntil: 'domcontentloaded' });
    const frameworks = ['GDPR', 'SOC', 'ISO'];
    let found = false;
    for (const fw of frameworks) {
      if (await page.locator(`text=${fw}`).isVisible().catch(() => false)) { found = true; break; }
    }
    expect(found).toBeTruthy();
  });
});
```

**Step 2 — Replace `frontend/playwright.config.ts` with this exact content:**

```typescript
import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: [['html'], ['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
```

**Step 3 — Run the tests:**
```bash
cd frontend
npx playwright install chromium   # only needed once
npx playwright test --reporter=list
```

**Step 4 — Report back with:** total tests, passed, failed, skipped, and the full error message + stack trace for any failing test. Do not modify test files to force tests to pass.import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: [['html'], ['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});

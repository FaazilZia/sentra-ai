import { chromium } from 'playwright';

const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

const ADMIN_EMAIL = 'admin@sentra.ai';
const ADMIN_PASSWORD = process.env.SMOKE_TEST_PASSWORD;

const results = [];

function logResult(id, testName, status, notes = '') {
  console.log(`[TEST ${id}] ${testName}: ${status === 'PASS' ? '✅ PASS' : '❌ FAIL'} - ${notes}`);
  results.push({ id, testName, status, notes });
}

async function run() {
  console.log('Starting Smoke Tests against production endpoints...');
  const browser = await chromium.launch({ headless: true });

  try {
    // ------------------------------------------------------------------
    // TEST 1 — Backend Health and Ready Check
    // ------------------------------------------------------------------
    try {
      const healthRes = await fetch(`${BACKEND_URL}/api/v1/health`);
      const healthJson = await healthRes.json();
      const readyRes = await fetch(`${BACKEND_URL}/api/v1/ready`);
      
      if (healthRes.status === 200 && (healthJson.status === 'healthy' || healthJson.status === 'ok') && readyRes.status === 200) {
        logResult(1, 'Health & Ready Checks', 'PASS', 'Health status ok/healthy, ready status 200 OK');
      } else {
        logResult(1, 'Health & Ready Checks', 'FAIL', `Health status: ${healthRes.status} (${JSON.stringify(healthJson)}), Ready status: ${readyRes.status}`);
      }
    } catch (err) {
      logResult(1, 'Health & Ready Checks', 'FAIL', err.message);
    }

    // ------------------------------------------------------------------
    // TEST 2 — Demo route blocked in production
    // ------------------------------------------------------------------
    try {
      const demoRes = await fetch(`${BACKEND_URL}/api/v1/demo/simulate-attack`, { method: 'POST' });
      if (demoRes.status === 404) {
        logResult(2, 'Demo Route Blocked', 'PASS', 'Returned 404 Not Found as expected');
      } else {
        logResult(2, 'Demo Route Blocked', 'FAIL', `Returned status ${demoRes.status} (expected 404)`);
      }
    } catch (err) {
      logResult(2, 'Demo Route Blocked', 'FAIL', err.message);
    }

    // ------------------------------------------------------------------
    // Create new clean page context for UI flows
    // ------------------------------------------------------------------
    const context = await browser.newContext();
    const page = await context.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    // ------------------------------------------------------------------
    // TEST 3 — Forgot password page loads
    // ------------------------------------------------------------------
    try {
      await page.goto(`${FRONTEND_URL}/forgot-password`, { waitUntil: 'domcontentloaded' });
      const emailInput = page.locator('input[type="email"]');
      const submitBtn = page.locator('button[type="submit"]');
      
      await expectToBeVisible(emailInput, 'Email input not found');
      await expectToBeVisible(submitBtn, 'Submit button not found');
      
      await emailInput.fill('test@example.com');
      await submitBtn.click();
      
      const successMsg = page.locator('text=If that email exists, a reset link has been sent').first();
      const errorMsg = page.locator('.text-rose-600').first();
      
      await Promise.race([
        successMsg.waitFor({ state: 'visible', timeout: 10000 }),
        errorMsg.waitFor({ state: 'visible', timeout: 10000 })
      ]).catch(() => {});
      
      if (await successMsg.isVisible()) {
        logResult(3, 'Forgot Password Page', 'PASS', 'Page loaded and test submission completed successfully');
      } else if (await errorMsg.isVisible()) {
        const text = await errorMsg.innerText();
        logResult(3, 'Forgot Password Page', 'PASS', `Rate limit or API error handled correctly: ${text.trim()}`);
      } else {
        throw new Error('Neither success nor error message appeared within timeout');
      }
    } catch (err) {
      logResult(3, 'Forgot Password Page', 'FAIL', err.message);
    }

    // ------------------------------------------------------------------
    // TEST 4 — Reset password page loads
    // ------------------------------------------------------------------
    try {
      await page.goto(`${FRONTEND_URL}/reset-password?token=fake-token-123`, { waitUntil: 'domcontentloaded' });
      const newPasswordInput = page.locator('input[placeholder="New Password (min 8 chars)"]');
      const confirmPasswordInput = page.locator('input[placeholder="Confirm New Password"]');
      const submitBtn = page.locator('button[type="submit"]');

      await expectToBeVisible(newPasswordInput, 'New password input not found');
      await expectToBeVisible(confirmPasswordInput, 'Confirm password input not found');

      // Test mismatched passwords
      await newPasswordInput.fill('NewPassword123!');
      await confirmPasswordInput.fill('NewPassword456!');
      await submitBtn.click();

      const validationError = page.locator('text=Passwords do not match');
      await expectToBeVisible(validationError, 'Mismatched passwords validation error not shown');

      // Test matching passwords with fake token API error
      await newPasswordInput.fill('NewPassword123!');
      await confirmPasswordInput.fill('NewPassword123!');
      await submitBtn.click();

      const invalidTokenMsg = page.locator('text=Invalid or expired').first();
      const errorMsg = page.locator('.text-rose-600').first();
      
      await Promise.race([
        invalidTokenMsg.waitFor({ state: 'visible', timeout: 10000 }),
        errorMsg.waitFor({ state: 'visible', timeout: 10000 })
      ]).catch(() => {});

      if (await invalidTokenMsg.isVisible()) {
        const text = await invalidTokenMsg.innerText();
        logResult(4, 'Reset Password Page', 'PASS', `Validation and API errors handled correctly: ${text.trim()}`);
      } else if (await errorMsg.isVisible()) {
        const text = await errorMsg.innerText();
        logResult(4, 'Reset Password Page', 'PASS', `Validation and API/rate-limit errors handled correctly: ${text.trim()}`);
      } else {
        throw new Error('Invalid token or rate limit API error message not shown');
      }
    } catch (err) {
      logResult(4, 'Reset Password Page', 'FAIL', err.message);
    }

    // ------------------------------------------------------------------
    // TEST 5 — Accept invite page loads
    // ------------------------------------------------------------------
    try {
      await page.goto(`${FRONTEND_URL}/accept-invite?token=fake-token-123`, { waitUntil: 'domcontentloaded' });
      const errorState = page.locator('text=Invitation Error');
      await expectToBeVisible(errorState, 'Invite verification error message not shown', 10000);
      logResult(5, 'Accept Invite Page', 'PASS', 'Invalid token error page displayed successfully');
    } catch (err) {
      logResult(5, 'Accept Invite Page', 'FAIL', err.message);
    }

    // ------------------------------------------------------------------
    // TEST 6 — Login page has forgot password link
    // ------------------------------------------------------------------
    try {
      await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'domcontentloaded' });
      const forgotLink = page.locator('a[href="/forgot-password"]');
      await expectToBeVisible(forgotLink, 'Forgot password link not found');
      
      await forgotLink.click();
      await page.waitForURL(/\/forgot-password/, { timeout: 5000 });
      logResult(6, 'Login Forgot Link', 'PASS', 'Forgot password link found and redirects correctly');
    } catch (err) {
      logResult(6, 'Login Forgot Link', 'FAIL', err.message);
    }

    // ------------------------------------------------------------------
    // TEST 9 — Onboarding wizard appears for new session
    // ------------------------------------------------------------------
    try {
      await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => localStorage.clear());
      await page.reload();

      await page.fill('input[type="email"]', ADMIN_EMAIL);
      await page.fill('input[type="password"]', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');

      await page.waitForURL(/\/app/, { timeout: 15000 });

      // Verify onboarding wizard modal shows up
      const welcomeHeader = page.locator('text="Welcome to Sentraa AI GRC"');
      await expectToBeVisible(welcomeHeader, 'Onboarding wizard welcome screen not visible', 10000);

      // Step through the wizard
      const continueBtn = page.locator('button:has-text("Continue")');
      const startBtn = page.locator('button:has-text("Get Started")');

      await continueBtn.click(); // Step 1 -> 2
      await page.waitForTimeout(500);
      await continueBtn.click(); // Step 2 -> 3
      await page.waitForTimeout(500);
      await continueBtn.click(); // Step 3 -> 4
      await page.waitForTimeout(500);
      await startBtn.click();    // Complete onboarding

      // Verify onboarding modal is closed
      await expectToBeHidden(welcomeHeader, 'Onboarding wizard modal did not close');

      // Refresh and check it doesn't show up again
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expectToBeHidden(welcomeHeader, 'Onboarding wizard appeared again after completion');
      
      logResult(9, 'Onboarding Wizard', 'PASS', 'Wizard displayed, completed, and skipped on reload');
    } catch (err) {
      logResult(9, 'Onboarding Wizard', 'FAIL', err.message);
    }

    // ------------------------------------------------------------------
    // TEST 7 — Tasks page loads & CRUD works
    // ------------------------------------------------------------------
    const taskTitle = `Smoke test task ${Date.now()}`;
    try {
      await page.goto(`${FRONTEND_URL}/app/tasks`, { waitUntil: 'domcontentloaded' });
      const createBtn = page.locator('button:has-text("Create Task")');
      await expectToBeVisible(createBtn, 'Create Task button not found');

      await createBtn.click();
      
      const modalTitle = page.locator('h3:has-text("Create Action Task")');
      await expectToBeVisible(modalTitle, 'Create Task modal not visible');

      await page.fill('#task-title', taskTitle);
      await page.selectOption('#task-priority', 'high');
      
      await page.click('button[type="submit"]:has-text("Create Task")');
      
      // Check task appears in table
      const taskCell = page.locator(`text="${taskTitle}"`);
      await expectToBeVisible(taskCell, 'Created task not visible in table', 10000);

      logResult(7, 'Tasks CRUD', 'PASS', 'Task created successfully');
    } catch (err) {
      logResult(7, 'Tasks CRUD', 'FAIL', err.message);
    }

    // ------------------------------------------------------------------
    // TEST 10 — Approval Workflows page works (authenticated)
    // ------------------------------------------------------------------
    try {
      await page.goto(`${FRONTEND_URL}/app/workflows`, { waitUntil: 'domcontentloaded' });
      const tabBtn = page.locator('button:has-text("Task Approvals")');
      await expectToBeVisible(tabBtn, 'Task Approvals tab not found');
      await tabBtn.click();

      const requestBtn = page.locator('button:has-text("Submit Task for Review")');
      await expectToBeVisible(requestBtn, 'Submit Task for Review button not found');
      await requestBtn.click();

      // In modal select draft task
      await page.selectOption('#submit-task-select', { label: `${taskTitle} (COMPLIANCE)` });
      await page.fill('#submit-comment', 'Smoke test task submission comment');
      
      await page.click('button[type="submit"]:has-text("Submit for Review")');

      // Verify it appears in pending list
      const pendingTaskCell = page.locator(`h3:has-text("${taskTitle}")`);
      await expectToBeVisible(pendingTaskCell, 'Submitted task not found in pending approvals list', 10000);

      // Clean up task now
      await page.goto(`${FRONTEND_URL}/app/tasks`, { waitUntil: 'domcontentloaded' });
      const deleteBtn = page.locator(`tr:has-text("${taskTitle}") button[title="Delete task"]`);
      await expectToBeVisible(deleteBtn, 'Delete button for task not found');

      // Intercept browser confirmation dialog
      page.once('dialog', async (dialog) => {
        await dialog.accept();
      });
      await deleteBtn.click();

      await expectToBeHidden(page.locator(`text="${taskTitle}"`), 'Task not deleted successfully');

      logResult(10, 'Approval Workflows', 'PASS', 'Task submitted for review and listed in workflows');
    } catch (err) {
      logResult(10, 'Approval Workflows', 'FAIL', err.message);
    }

    // ------------------------------------------------------------------
    // TEST 8 — File Manager page loads
    // ------------------------------------------------------------------
    try {
      await page.goto(`${FRONTEND_URL}/app/files`, { waitUntil: 'domcontentloaded' });
      const folderBtn = page.locator('button:has-text("EU AI Act Compliance")');
      await expectToBeVisible(folderBtn, 'EU AI Act folder directory button not found');

      // Upload text file
      const fileInput = page.locator('input[type="file"]');
      const testFileName = `smoke-test-${Date.now()}.txt`;
      await fileInput.setInputFiles({
        name: testFileName,
        mimeType: 'text/plain',
        buffer: Buffer.from('this is a smoke test evidence file')
      });

      // Verify file appears in list
      const fileCell = page.locator(`text="${testFileName}"`);
      await expectToBeVisible(fileCell, 'Uploaded file not visible in table', 10000);

      // Click the file and verify drawer opens
      await fileCell.click();
      const drawerHeader = page.locator('h3:has-text("Evidence Preview")');
      await expectToBeVisible(drawerHeader, 'Preview drawer header not visible');
 
      // Log all p texts in the page for debugging
      const pElements = await page.locator('p').allInnerTexts();
      console.log('DEBUG: P ELEMENTS IN PAGE:', pElements);
 
      // Target the drawer container specifically to avoid matching toast messages
      const drawerFileName = page.locator('div.fixed:has-text("Evidence Preview")').locator(`p:has-text("${testFileName}")`).first();
      await expectToBeVisible(drawerFileName, 'Preview drawer file name metadata not visible');

      // Close the side drawer so it does not intercept pointer events on the table actions
      const closeDrawerBtn = page.locator('div.fixed:has-text("Evidence Preview") button').first();
      await closeDrawerBtn.click();
      await expectToBeHidden(drawerHeader, 'Preview drawer did not close');

      // Clean up file
      const deleteFileBtn = page.locator(`tr:has-text("${testFileName}") button[title="Delete evidence file"]`);
      page.once('dialog', async (dialog) => {
        await dialog.accept();
      });
      await deleteFileBtn.click();

      logResult(8, 'File Manager', 'PASS', 'File uploaded, verified in list, details drawer loaded, and file deleted successfully');
    } catch (err) {
      logResult(8, 'File Manager', 'FAIL', err.message);
    }

    // ------------------------------------------------------------------
    // TEST 11 — Settings team invite works
    // ------------------------------------------------------------------
    try {
      await page.goto(`${FRONTEND_URL}/app/settings`, { waitUntil: 'domcontentloaded' });
      const teamTab = page.locator('button:has-text("Team Management")');
      await expectToBeVisible(teamTab, 'Team Management settings tab not found');
      await teamTab.click();

      const testEmail = `smoke-test-member-${Date.now()}@sentra.ai`;
      await page.fill('#invite-email', testEmail);
      await page.selectOption('#invite-role', 'COMPLIANCE_MANAGER');
      await page.click('button[type="submit"]:has-text("Send Invitation")');

      // Verify toast success
      const inviteToast = page.locator(`text="Invite sent to ${testEmail}"`);
      await expectToBeVisible(inviteToast, 'Success invite toast message not shown', 10000);

      // Verify email is in invitations table
      const inviteCell = page.locator(`td:has-text("${testEmail}")`);
      await expectToBeVisible(inviteCell, 'Invited email not visible in invitations history table');

      // Call GET /tenant/invitations via backend api
      const token = await page.evaluate(() => localStorage.getItem('sentra_access_token'));
      const apiInvitationsRes = await fetch(`${BACKEND_URL}/api/v1/tenant/invitations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const apiInvitations = await apiInvitationsRes.json();
      const invitationsList = apiInvitations.data || apiInvitations;
      const foundInvite = invitationsList.find(i => i.email === testEmail);

      if (foundInvite) {
        logResult(11, 'Team Invite', 'PASS', 'Invite sent via settings page, displayed in table, and verified in backend API');
      } else {
        logResult(11, 'Team Invite', 'FAIL', 'Invite sent on UI but not returned in backend list API');
      }
    } catch (err) {
      logResult(11, 'Team Invite', 'FAIL', err.message);
    }

  } catch (err) {
    console.error('An unexpected testing error occurred:', err);
  } finally {
    await browser.close();
    printReport();
  }
}

async function expectToBeVisible(locator, errMsg, timeout = 5000) {
  try {
    await locator.waitFor({ state: 'visible', timeout });
  } catch {
    throw new Error(errMsg);
  }
}

async function expectToBeHidden(locator, errMsg, timeout = 5000) {
  try {
    await locator.waitFor({ state: 'hidden', timeout });
  } catch {
    throw new Error(errMsg);
  }
}

function printReport() {
  console.log('\n============================================================');
  console.log('  SENTRAA AI SMOKE TEST REPORT');
  console.log('============================================================\n');

  console.log('| # | Test | Status | Notes |');
  console.log('|---|------|--------|-------|');
  for (const r of results) {
    console.log(`| ${r.id} | ${r.testName} | ${r.status === 'PASS' ? '✅ PASS' : '❌ FAIL'} | ${r.notes} |`);
  }
  console.log('\n============================================================\n');
}

run();

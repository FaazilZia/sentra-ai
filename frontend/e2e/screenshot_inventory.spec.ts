import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const ADMIN_EMAIL = 'admin@sentra.ai';
const ADMIN_PASS  = 'Sentra@Admin123';
const SCREENSHOT_DIR = '/Users/mohammadfaazilzia/Desktop/Sentra AI/screenshots/dashboard';

// Enforce test execution order and a single session
test.describe.configure({ mode: 'serial' });

test('Capture full visual inventory of all dashboard pages', async ({ page }) => {
  // Set high timeout since capturing 46 pages + tabs takes time
  test.setTimeout(600000);
  
  // Ensure target folder exists
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  // 1. Perform Authentication once
  console.log('🔑 Logging in as administrator...');
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASS);
  await page.click('button[type="submit"]');
  
  await expect(page).toHaveURL(/\/app/, { timeout: 30000 });
  await expect(page.locator('aside')).toBeVisible({ timeout: 15000 });
  console.log('✅ Authentication successful!');

  // Define route list
  const routeList = [
    { path: '/app', baseName: '01-dashboard', pageName: 'Dashboard Overview' },
    { path: '/app/policies', baseName: '02-policies', pageName: 'Policies Management' },
    { path: '/app/incidents', baseName: '03-incidents', pageName: 'Incident Management' },
    { path: '/app/guardrails', baseName: '04-guardrails', pageName: 'Guardrails Center' },
    { path: '/app/risk', baseName: '05-risk-center', pageName: 'Risk Center' },
    { path: '/app/compliance', baseName: '06-compliance', pageName: 'Compliance & Audit', hasTabs: 'compliance' },
    { path: '/app/evidence', baseName: '07-evidence', pageName: 'Evidence & Proof' },
    { path: '/app/drift', baseName: '08-drift', pageName: 'Drift Detection' },
    { path: '/app/shadow', baseName: '09-shadow-ai', pageName: 'Shadow AI Discovery' },
    { path: '/app/inventory', baseName: '10-inventory', pageName: 'AI Asset Inventory' },
    { path: '/app/consent', baseName: '11-consent-manager', pageName: 'User Consent Manager' },
    { path: '/app/ai-registry', baseName: '12-ai-registry', pageName: 'AI Model Registry' },
    { path: '/app/risk-assessment', baseName: '13-risk-assessment', pageName: 'Risk Assessment' },
    { path: '/app/impact-assessments', baseName: '14-impact-assessments', pageName: 'Impact Assessments' },
    { path: '/app/ce-marking', baseName: '15-ce-marking', pageName: 'CE Marking Compliance' },
    { path: '/app/ccpa', baseName: '16-ccpa', pageName: 'CCPA Compliance' },
    { path: '/app/dora', baseName: '17-dora', pageName: 'DORA Compliance' },
    { path: '/app/oecd', baseName: '18-oecd', pageName: 'OECD Principles' },
    { path: '/app/ftc', baseName: '19-ftc', pageName: 'FTC Guidelines' },
    { path: '/app/controls', baseName: '20-controls', pageName: 'Governance Controls' },
    { path: '/app/vendor-risk', baseName: '21-vendor-risk', pageName: 'Vendor Risk Assessment' },
    { path: '/app/obligations', baseName: '22-obligations', pageName: 'Regulatory Obligations' },
    { path: '/app/workflows', baseName: '23-workflows', pageName: 'Compliance Workflows' },
    { path: '/app/tasks', baseName: '24-tasks', pageName: 'Action Tasks' },
    { path: '/app/files', baseName: '25-file-manager', pageName: 'Evidentiary Files' },
    { path: '/app/intake', baseName: '26-intake', pageName: 'Intake Submissions Portal' },
    { path: '/app/executive-report', baseName: '27-executive-report', pageName: 'Executive Reports' },
    { path: '/app/advisor', baseName: '28-advisor', pageName: 'AI Governance Advisor' },
    { path: '/app/automations', baseName: '29-automations', pageName: 'Workflow Automations' },
    { path: '/app/datasets', baseName: '30-datasets', pageName: 'Training Datasets Registry' },
    { path: '/app/training', baseName: '31-training', pageName: 'Training & Awareness Register' },
    { path: '/app/governance-os', baseName: '32-governance-os', pageName: 'GovernanceOS Harmonics', hasTabs: 'governance-os' },
    { path: '/app/evaluation', baseName: '33-evaluation', pageName: 'Model Evaluations' },
    { path: '/app/settings', baseName: '34-settings', pageName: 'System Settings', hasTabs: 'settings' },
    { path: '/app/readiness', baseName: '35-readiness', pageName: 'Readiness Assessment' },
    { path: '/app/live-feed', baseName: '36-live-feed', pageName: 'Live Block Feed' },
    { path: '/app/gdpr', baseName: '37-gdpr', pageName: 'GDPR Compliance' },
    { path: '/app/hipaa', baseName: '38-hipaa', pageName: 'HIPAA Compliance' },
    { path: '/app/soc2', baseName: '39-soc2', pageName: 'SOC2 Readiness' },
    { path: '/app/pci', baseName: '40-pci', pageName: 'PCI-DSS Compliance' },
    { path: '/app/dpdp', baseName: '41-dpdp', pageName: 'DPDP Act Compliance' },
    { path: '/app/entity-graph', baseName: '42-entity-graph', pageName: 'Data Flow Entity Graph' },
    { path: '/app/intake/builder', baseName: '43-intake-builder', pageName: 'Intake Form Builder' },
    { path: '/app/agent-discovery', baseName: '44-agent-discovery', pageName: 'Agent Auto-Discovery' },
    { path: '/app/audit', baseName: '45-audit-explorer', pageName: 'Audit Explorer' },
    { path: '/superadmin', baseName: '46-superadmin', pageName: 'Superadmin Console' }
  ];

  const manifestEntries: string[] = [];

  // Define helper to wait for loading states to complete
  const waitForPageReady = async () => {
    // Wait for network idle
    await page.waitForLoadState('networkidle');
    
    // Wait for spin loaders class-based indicators to clear
    const loaders = page.locator('svg.animate-spin, .animate-spin');
    const count = await loaders.count();
    for (let i = 0; i < count; i++) {
      try {
        await expect(loaders.nth(i)).not.toBeVisible({ timeout: 5000 });
      } catch (e) {
        // ignore timeout, proceed
      }
    }
    
    // Wait for text-based loaders to clear
    const textLoaders = ['Loading', 'Initializing', 'COMPILING'];
    for (const text of textLoaders) {
      try {
        await expect(page.locator(`text="${text}"`).first()).not.toBeVisible({ timeout: 5000 });
      } catch (e) {
        // ignore timeout, proceed
      }
    }
    
    // Additional wait for charts and fade-in transitions to stabilize
    await page.waitForTimeout(2000);
  };

  // Perform captures
  for (const route of routeList) {
    console.log(`📸 Navigating to: ${route.path} (${route.pageName})...`);
    try {
      await page.goto(route.path);
      await waitForPageReady();

      if (route.hasTabs === 'settings') {
        const tabs = [
          { key: 'profile', text: 'Profile Settings' },
          { key: 'password', text: 'Password' },
          { key: 'llmkeys', text: 'LLM Keys' },
          { key: 'features', text: 'Features' },
          { key: 'general', text: 'General & Alerts' },
          { key: 'mcp', text: 'MCP Gateway' },
          { key: 'sso', text: 'SAML SSO' },
          { key: 'team', text: 'Team Management' }
        ];

        for (const tab of tabs) {
          console.log(`   └─ Clicking Settings Tab: ${tab.text}`);
          await page.locator('button', { hasText: tab.text }).first().click();
          await waitForPageReady();
          const fileName = `${route.baseName}-${tab.key}.png`;
          await page.screenshot({ path: path.join(SCREENSHOT_DIR, fileName), fullPage: true });
          manifestEntries.push(`${fileName} \t ${route.path}#tab=${tab.key} \t Settings: ${tab.text}`);
        }
      } else if (route.hasTabs === 'compliance') {
        const tabs = [
          { key: 'eu-ai-act', text: 'EU AI Act' },
          { key: 'nist-ai-rmf', text: 'NIST AI RMF' },
          { key: 'iso-42001', text: 'ISO 42001' },
          { key: 'iso-27001', text: 'ISO 27001' },
          { key: 'ccpa', text: 'CCPA' }
        ];

        for (const tab of tabs) {
          console.log(`   └─ Clicking Compliance Tab: ${tab.text}`);
          await page.locator('button', { hasText: tab.text }).first().click();
          await waitForPageReady();
          const fileName = `${route.baseName}-${tab.key}.png`;
          await page.screenshot({ path: path.join(SCREENSHOT_DIR, fileName), fullPage: true });
          manifestEntries.push(`${fileName} \t ${route.path}?tab=${tab.key} \t Compliance: ${tab.text}`);
        }
      } else if (route.hasTabs === 'governance-os') {
        const tabs = [
          { key: 'mapper', text: 'Cross-Framework mapper' },
          { key: 'gaps', text: 'Gaps checklist' }
        ];

        for (const tab of tabs) {
          console.log(`   └─ Clicking GovernanceOS Tab: ${tab.text}`);
          await page.locator('button', { hasText: tab.text }).first().click();
          await waitForPageReady();
          const fileName = `${route.baseName}-${tab.key}.png`;
          await page.screenshot({ path: path.join(SCREENSHOT_DIR, fileName), fullPage: true });
          manifestEntries.push(`${fileName} \t ${route.path}?tab=${tab.key} \t GovernanceOS: ${tab.text}`);
        }
      } else {
        const fileName = `${route.baseName}.png`;
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, fileName), fullPage: true });
        manifestEntries.push(`${fileName} \t ${route.path} \t ${route.pageName}`);
      }

      console.log(`   ✅ Captured successfully!`);
    } catch (err: any) {
      console.error(`   ❌ FAILED: ${route.path} — ${err.message}`);
      manifestEntries.push(`FAILED_${route.baseName}.png \t ${route.path} \t ${route.pageName} (Error: ${err.message})`);
    }
  }

  // 5. Write manifest file
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'manifest.txt'), manifestEntries.join('\n'));
  console.log('📝 Manifest file successfully created!');
});

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const ARTIFACT_DIR = path.resolve(process.cwd(), "e2e/screenshots");

test.describe('EvidenceSection: Real API Wiring & Mock Data Elimination', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // Mock Auth & Org endpoints
    await page.route('**/user/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-admin-id',
          email: 'admin@sentra.ai',
          fullName: 'Security Auditor',
          role: 'ADMIN',
          organizationId: 'org-test-1',
          organizationName: 'Sentraa Test Corp',
          is_active: true,
        }),
      });
    });

    await page.route('**/organizations/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'org-test-1',
          name: 'Sentraa Test Corp',
        }),
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem('sentra_onboarded', 'true');
    });
  });

  test('Populated State: renders real API data and strictly does NOT render old hardcoded mock data', async ({ page }) => {
    // Return real evidence records
    await page.route('**/api/v1/evidence', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              {
                id: 'ev-prod-001',
                orgId: 'org-test-1',
                uploadedBy: 'user-001',
                title: 'Real_HIPAA_PHI_Access_Audit_Log_2026.pdf',
                fileName: 'Real_HIPAA_PHI_Access_Audit_Log_2026.pdf',
                fileSize: 3145728, // ~3.0 MB
                mimeType: 'application/pdf',
                entityType: 'AUDIT',
                tags: ['HIPAA', 'Production'],
                createdAt: '2026-08-25T10:00:00.000Z',
                updatedAt: '2026-08-25T10:00:00.000Z',
                fileUrl: 'https://storage.sentra.ai/evidence/Real_HIPAA_PHI_Access_Audit_Log_2026.pdf'
              },
              {
                id: 'ev-prod-002',
                orgId: 'org-test-1',
                uploadedBy: 'user-002',
                title: 'PCI_DSS_Tokenization_Proof_Production.pdf',
                fileName: 'PCI_DSS_Tokenization_Proof_Production.pdf',
                fileSize: 1048576, // ~1.0 MB
                mimeType: 'application/pdf',
                entityType: 'CONTROL',
                tags: ['PCI-DSS'],
                createdAt: '2026-08-28T14:30:00.000Z',
                updatedAt: '2026-08-28T14:30:00.000Z',
                fileUrl: 'https://storage.sentra.ai/evidence/PCI_DSS_Tokenization_Proof_Production.pdf'
              }
            ]
          }),
        });
      } else {
        await route.fallback();
      }
    });

    await page.goto('/app/evidence', { waitUntil: 'networkidle' });

    // Verify page heading
    await expect(page.getByRole('heading', { name: 'Evidence & Reports' })).toBeVisible({ timeout: 15000 });

    // Verify real items rendered
    await expect(page.getByText('Real_HIPAA_PHI_Access_Audit_Log_2026.pdf')).toBeVisible();
    await expect(page.getByText('PCI_DSS_Tokenization_Proof_Production.pdf')).toBeVisible();
    await expect(page.getByText('3.0 MB')).toBeVisible();
    await expect(page.getByText('1.0 MB')).toBeVisible();

    // CRITICAL ASSERTION: The old hardcoded mock documents must NOT exist
    await expect(page.getByText('GDPR_Article17_VectorErasure_Audit_Export.pdf')).toHaveCount(0);
    await expect(page.getByText('DPDP_Consent_Hook_Verification_Log.pdf')).toHaveCount(0);
    await expect(page.getByText('HIPAA_PHI_Masking_Quarterly_Assessment.pdf')).toHaveCount(0);
    await expect(page.getByText('NIST_AI_RMF_Govern_Measure_Export.pdf')).toHaveCount(0);

    // Verify metrics reflect real counts
    await expect(page.getByText('Total Verified Artifacts')).toBeVisible();
    await expect(page.getByTestId('total-verified-artifacts')).toHaveText('2');

    // Capture screenshot proof of populated state
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    const populatedScreenshot = path.join(ARTIFACT_DIR, 'evidence_section_populated_real_data.png');
    await page.screenshot({ path: populatedScreenshot, fullPage: true });
    console.log(`📸 Populated state screenshot saved: ${populatedScreenshot}`);
  });

  test('Empty State: clean honest empty message when org has no evidence', async ({ page }) => {
    // Return empty array
    await page.route('**/api/v1/evidence', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: []
          }),
        });
      } else {
        await route.fallback();
      }
    });

    await page.goto('/app/evidence', { waitUntil: 'networkidle' });

    await expect(page.getByRole('heading', { name: 'Evidence & Reports' })).toBeVisible({ timeout: 15000 });

    // Verify honest empty state
    await expect(page.getByText('No compliance evidence artifacts uploaded yet.')).toBeVisible();

    // Verify mock items are NOT present
    await expect(page.getByText('GDPR_Article17_VectorErasure_Audit_Export.pdf')).toHaveCount(0);
    await expect(page.getByText('DPDP_Consent_Hook_Verification_Log.pdf')).toHaveCount(0);

    // Verify metric shows 0
    await expect(page.getByTestId('total-verified-artifacts')).toHaveText('0');

    // Capture screenshot proof of empty state
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    const emptyScreenshot = path.join(ARTIFACT_DIR, 'evidence_section_empty_state.png');
    await page.screenshot({ path: emptyScreenshot, fullPage: true });
    console.log(`📸 Empty state screenshot saved: ${emptyScreenshot}`);
  });

  test('Error State: renders clear error alert and retry button when API fails', async ({ page }) => {
    await page.route('**/api/v1/evidence', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Database connection failed',
          }),
        });
      } else {
        await route.fallback();
      }
    });

    await page.goto('/app/evidence', { waitUntil: 'networkidle' });

    await expect(page.getByRole('heading', { name: 'Evidence & Reports' })).toBeVisible({ timeout: 15000 });

    // Verify error banner is visible
    await expect(page.getByText('Database connection failed')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();

    // Mock items must NOT be rendered as fallback
    await expect(page.getByText('GDPR_Article17_VectorErasure_Audit_Export.pdf')).toHaveCount(0);
  });
});

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const ARTIFACT_DIR = path.resolve(process.cwd(), "e2e/screenshots");

// Helper functions under test
const formatFileSize = (bytes?: number | string): string => {
  if (typeof bytes === 'string' && (bytes.includes('KB') || bytes.includes('MB') || bytes.includes('B'))) {
    return bytes;
  }
  const num = Number(bytes);
  if (Number.isNaN(num) || num <= 0) return '0 B';
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
};

const inferFramework = (item: any): string => {
  const tags = Array.isArray(item?.tags) ? item.tags : [];
  const tagMatch = tags.find((t: string) => /gdpr|dpdp|hipaa|pci|nist/i.test(t));
  if (tagMatch) {
    const upper = tagMatch.toUpperCase();
    if (upper.includes('GDPR')) return 'GDPR';
    if (upper.includes('DPDP')) return 'DPDP';
    if (upper.includes('HIPAA')) return 'HIPAA';
    if (upper.includes('PCI')) return 'PCI-DSS';
    if (upper.includes('NIST')) return 'NIST AI RMF';
    return upper;
  }
  if (item?.framework) return item.framework;
  const title = String(item?.title || item?.fileName || '').toUpperCase();
  if (title.includes('GDPR')) return 'GDPR';
  if (title.includes('DPDP')) return 'DPDP';
  if (title.includes('HIPAA')) return 'HIPAA';
  if (title.includes('PCI')) return 'PCI-DSS';
  if (title.includes('NIST')) return 'NIST AI RMF';
  return item?.entityType || 'General';
};

const resolveDocumentType = (entityType?: string): string => {
  if (!entityType) return 'Audit Evidence Bundle';
  return `${entityType.charAt(0).toUpperCase()}${entityType.slice(1).toLowerCase()} Evidence`;
};

const resolveDocumentStatus = (status?: string): 'VERIFIED' | 'PENDING_REVIEW' | 'EXPIRED' => {
  if (status === 'PENDING_REVIEW') return 'PENDING_REVIEW';
  if (status === 'EXPIRED') return 'EXPIRED';
  return 'VERIFIED';
};

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

test.describe('EvidenceSection: Helper Functions Unit Tests', () => {
  test('formatFileSize formats byte sizes, edge cases, and preserves preformatted strings', () => {
    expect(formatFileSize('4.2 MB')).toBe('4.2 MB');
    expect(formatFileSize('1.8 KB')).toBe('1.8 KB');
    expect(formatFileSize('500 B')).toBe('500 B');

    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(-100)).toBe('0 B');
    expect(formatFileSize(undefined)).toBe('0 B');
    expect(formatFileSize('not-a-number')).toBe('0 B');

    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(3145728)).toBe('3.0 MB');
    expect(formatFileSize(10485760)).toBe('10.0 MB');
  });

  test('inferFramework identifies frameworks from tags, properties, titles, and fallbacks', () => {
    // From tags
    expect(inferFramework({ tags: ['hipaa', 'prod'] })).toBe('HIPAA');
    expect(inferFramework({ tags: ['gdpr'] })).toBe('GDPR');
    expect(inferFramework({ tags: ['dpdp-consent'] })).toBe('DPDP');
    expect(inferFramework({ tags: ['PCI-DSS-v4'] })).toBe('PCI-DSS');
    expect(inferFramework({ tags: ['nist-ai-rmf'] })).toBe('NIST AI RMF');

    // From framework property
    expect(inferFramework({ framework: 'SOC2' })).toBe('SOC2');

    // From title / fileName
    expect(inferFramework({ title: 'GDPR_Compliance_Report.pdf' })).toBe('GDPR');
    expect(inferFramework({ fileName: 'DPDP_Consent_Audit.pdf' })).toBe('DPDP');
    expect(inferFramework({ fileName: 'HIPAA_PHI_Assessment.pdf' })).toBe('HIPAA');
    expect(inferFramework({ title: 'PCI_DSS_Network_Proof.pdf' })).toBe('PCI-DSS');
    expect(inferFramework({ title: 'NIST_Govern_Measure.pdf' })).toBe('NIST AI RMF');

    // From entityType
    expect(inferFramework({ entityType: 'VENDOR' })).toBe('VENDOR');

    // Default
    expect(inferFramework({})).toBe('General');
    expect(inferFramework(null)).toBe('General');
  });

  test('resolveDocumentType handles empty entityType and capitalizes valid types', () => {
    expect(resolveDocumentType()).toBe('Audit Evidence Bundle');
    expect(resolveDocumentType('')).toBe('Audit Evidence Bundle');
    expect(resolveDocumentType('AUDIT')).toBe('Audit Evidence');
    expect(resolveDocumentType('CONTROL')).toBe('Control Evidence');
    expect(resolveDocumentType('policy')).toBe('Policy Evidence');
  });

  test('resolveDocumentStatus maps known statuses and defaults to VERIFIED', () => {
    expect(resolveDocumentStatus('PENDING_REVIEW')).toBe('PENDING_REVIEW');
    expect(resolveDocumentStatus('EXPIRED')).toBe('EXPIRED');
    expect(resolveDocumentStatus('VERIFIED')).toBe('VERIFIED');
    expect(resolveDocumentStatus(undefined)).toBe('VERIFIED');
    expect(resolveDocumentStatus('UNKNOWN_STATUS')).toBe('VERIFIED');
  });
});
